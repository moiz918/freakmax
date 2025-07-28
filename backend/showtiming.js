const express = require("express");
const { sql, poolPromise } = require("./db");
const { authenticateUser, authorizeRole } = require("./authMidware");

const router = express.Router();

// ✅ GET ALL SHOW TIMINGS (Access: User & Admin)
router.get("/", authenticateUser, authorizeRole("user", "admin"), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT Show_ID, Cinema_ID, Screen_ID, Movie_ID, 
                   CONVERT(VARCHAR, Show_Time, 108) AS Show_Time,
                   CONVERT(VARCHAR, Show_Date, 23) AS Show_Date
            FROM Show_Timings
        `);

        res.status(200).json({
            success: true,
            showTimings: result.recordset
        });
    } catch (error) {
        console.error("Error fetching show timings:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});

// ✅ GET SPECIFIC SHOW TIMING (Access: User & Admin)
router.get("/:Show_ID", authenticateUser, authorizeRole("user", "admin"), async (req, res) => {
    try {
        const { Show_ID } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input("Show_ID", sql.Int, Show_ID)
            .query(`
                SELECT Show_ID, Cinema_ID, Screen_ID, Movie_ID, 
                       CONVERT(VARCHAR, Show_Time, 108) AS Show_Time,
                       CONVERT(VARCHAR, Show_Date, 23) AS Show_Date
                FROM Show_Timings 
                WHERE Show_ID = @Show_ID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Show timing not found" 
            });
        }

        res.status(200).json({
            success: true,
            showTiming: result.recordset[0]
        });
    } catch (error) {
        console.error("Error fetching show timing:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: error.message
        });
    }
});

// ✅ ADD SHOW TIMING (Access: Admin Only)
router.post("/", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { Cinema_ID, Screen_ID, Movie_ID, Show_Time, Show_Date } = req.body;

        // Validate required fields
        if (!Cinema_ID || !Screen_ID || !Movie_ID || !Show_Time || !Show_Date) {
            return res.status(400).json({ 
                success: false, 
                message: "All fields are required (Cinema_ID, Screen_ID, Movie_ID, Show_Time, Show_Date)" 
            });
        }

        // Convert time to SQL Server compatible format (HH:MM:SS)
        let sqlTime;
        try {
            // Remove any whitespace
            const cleanTime = Show_Time.trim();
            
            // Regular expression to validate HH:MM:SS or HH:MM format
            const timePattern = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
            
            const match = cleanTime.match(timePattern);
            if (!match) {
                throw new Error('Invalid time format');
            }
            
            const hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const seconds = match[3] ? parseInt(match[3]) : 0;
            
            // Format as HH:MM:SS
            sqlTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
        } catch (error) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid time format. Please use HH:MM or HH:MM:SS format (24-hour clock)",
                example: "14:30 or 14:30:00",
                received: Show_Time
            });
        }

        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(Show_Date)) {
            return res.status(400).json({ 
                success: false, 
                message: "Show date must be in YYYY-MM-DD format",
                example: "2023-12-25",
                received: Show_Date
            });
        }

        const pool = await poolPromise;

        // Check for conflicting show timings
        const conflictCheck = await pool.request()
            .input("Screen_ID", sql.Int, Screen_ID)
            .input("Show_Date", sql.Date, Show_Date)
            .input("Show_Time", sql.Time, sqlTime)
            .query(`
                SELECT Show_ID 
                FROM Show_Timings 
                WHERE Screen_ID = @Screen_ID 
                AND Show_Date = @Show_Date 
                AND ABS(DATEDIFF(MINUTE, Show_Time, @Show_Time)) < 30
            `);

        if (conflictCheck.recordset.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Show timing conflicts with an existing show (minimum 30 minutes between shows required)" 
            });
        }

        // Add new show timing
        const result = await pool.request()
            .input("Cinema_ID", sql.Int, Cinema_ID)
            .input("Screen_ID", sql.Int, Screen_ID)
            .input("Movie_ID", sql.Int, Movie_ID)
            .input("Show_Time", sql.Time, sqlTime)
            .input("Show_Date", sql.Date, Show_Date)
            .query(`
                INSERT INTO Show_Timings 
                (Cinema_ID, Screen_ID, Movie_ID, Show_Time, Show_Date) 
                OUTPUT INSERTED.Show_ID
                VALUES (@Cinema_ID, @Screen_ID, @Movie_ID, @Show_Time, @Show_Date)
            `);

        res.status(201).json({ 
            success: true, 
            message: "Show timing created successfully",
            showId: result.recordset[0].Show_ID,
            showTime: sqlTime,
            showDate: Show_Date
        });
    } catch (error) {
        console.error("Error creating show timing:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to create show timing",
            error: error.message,
            details: "Please ensure all fields are valid and the time slot is available"
        });
    }
});

// ✅ UPDATE SHOW TIMING (Access: Admin Only) - Limited fields version (with Movie_ID)
router.put("/:Show_ID", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { Show_ID } = req.params;
        const { Show_Date, Cinema_ID, Screen_ID, Movie_ID } = req.body;

        // Validate required fields are provided
        if (!Show_Date || !Cinema_ID || !Screen_ID || !Movie_ID) {
            return res.status(400).json({ 
                success: false, 
                message: "All fields (Show_Date, Cinema_ID, Screen_ID, Movie_ID) are required" 
            });
        }

        // Validate numeric IDs
        if (isNaN(Cinema_ID) || isNaN(Screen_ID) || isNaN(Movie_ID)) {
            return res.status(400).json({ 
                success: false, 
                message: "Cinema_ID, Screen_ID, and Movie_ID must be numeric values" 
            });
        }

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(Show_Date)) {
            return res.status(400).json({ 
                success: false, 
                message: "Show date must be in YYYY-MM-DD format" 
            });
        }

        const pool = await poolPromise;

        // Get existing show information (we need the original Show_Time)
        const showInfo = await pool.request()
            .input("Show_ID", sql.Int, Show_ID)
            .query("SELECT Show_Time FROM Show_Timings WHERE Show_ID = @Show_ID");

        if (showInfo.recordset.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Show timing not found" 
            });
        }

        const originalShowTime = showInfo.recordset[0].Show_Time;

        // Verify movie exists
        const movieCheck = await pool.request()
            .input("Movie_ID", sql.Int, Movie_ID)
            .query("SELECT 1 FROM Movies WHERE Movie_ID = @Movie_ID");

        if (movieCheck.recordset.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Specified movie does not exist" 
            });
        }

        // Check for conflicts with the new timing (using original Show_Time)
        const conflictCheck = await pool.request()
            .input("Screen_ID", sql.Int, Screen_ID)
            .input("Show_Date", sql.Date, Show_Date)
            .input("Show_Time", sql.Time, originalShowTime)
            .input("Show_ID", sql.Int, Show_ID)
            .query(`
                SELECT Show_ID 
                FROM Show_Timings 
                WHERE Screen_ID = @Screen_ID 
                AND Show_Date = @Show_Date 
                AND ABS(DATEDIFF(MINUTE, Show_Time, @Show_Time)) < 30
                AND Show_ID != @Show_ID
            `);

        if (conflictCheck.recordset.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Updated show timing conflicts with an existing show (minimum 30 minutes between shows required)" 
            });
        }

        // Verify cinema and screen relationship
        const screenCheck = await pool.request()
            .input("Cinema_ID", sql.Int, Cinema_ID)
            .input("Screen_ID", sql.Int, Screen_ID)
            .query("SELECT 1 FROM Screens WHERE Cinema_ID = @Cinema_ID AND Screen_ID = @Screen_ID");

        if (screenCheck.recordset.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Screen does not belong to the specified cinema" 
            });
        }

        // Update only the allowed fields
        const result = await pool.request()
            .input("Show_ID", sql.Int, Show_ID)
            .input("Show_Date", sql.Date, Show_Date)
            .input("Cinema_ID", sql.Int, Cinema_ID)
            .input("Screen_ID", sql.Int, Screen_ID)
            .input("Movie_ID", sql.Int, Movie_ID)
            .query(`
                UPDATE Show_Timings 
                SET 
                    Show_Date = @Show_Date,
                    Cinema_ID = @Cinema_ID,
                    Screen_ID = @Screen_ID,
                    Movie_ID = @Movie_ID
                WHERE Show_ID = @Show_ID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Show timing not found" 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: "Show timing updated successfully",
            updatedFields: {
                Show_Date,
                Cinema_ID,
                Screen_ID,
                Movie_ID
            }
        });
    } catch (error) {
        console.error("Error updating show timing:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to update show timing",
            error: error.message
        });
    }
});


// ✅ DELETE SHOW TIMING (Access: Admin Only)
router.delete("/:Show_ID", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { Show_ID } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input("Show_ID", sql.Int, Show_ID)
            .query("DELETE FROM Show_Timings WHERE Show_ID = @Show_ID");

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Show timing not found" 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: "Show timing deleted successfully" 
        });
    } catch (error) {
        console.error("Error deleting show timing:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to delete show timing",
            error: error.message
        });
    }
});

module.exports = router;
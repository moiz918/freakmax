const express = require("express");
const { sql, poolPromise } = require("./db");
const { authenticateUser, authorizeRole } = require("./authMidware");

const router = express.Router();

// ✅ GET ALL SCREENS (Access: User & Admin)
router.get("/", authenticateUser, authorizeRole("user", "admin"), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM Screens");

        res.status(200).json({
            success: true,
            screens: result.recordset
        });
    } catch (error) {
        console.error("Error fetching screens:", error);
        res.status(500).json({
            success: false,
            message: "Server error, try again",
            error: error.message
        });
    }
});

// ✅ GET SCREENS FOR A SPECIFIC CINEMA (Access: User & Admin)
router.get("/cinema/:Cinema_ID", authenticateUser, authorizeRole("user", "admin"), async (req, res) => {
    try {
        const { Cinema_ID } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input("Cinema_ID", sql.Int, Cinema_ID)
            .query("SELECT * FROM Screens WHERE Cinema_ID = @Cinema_ID");

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "No screens found for this cinema" 
            });
        }

        res.status(200).json({ 
            success: true, 
            data: result.recordset 
        });
    } catch (error) {
        console.error("Error fetching screens:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error",
            error: error.message
        });
    }
});

// ✅ GET A SPECIFIC SCREEN (Access: User & Admin)
router.get("/:Screen_ID", authenticateUser, authorizeRole("user", "admin"), async (req, res) => {
    try {
        const { Screen_ID } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input("Screen_ID", sql.Int, Screen_ID)
            .query("SELECT * FROM Screens WHERE Screen_ID = @Screen_ID");

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Screen not found" 
            });
        }

        res.status(200).json({ 
            success: true, 
            data: result.recordset[0] 
        });
    } catch (error) {
        console.error("Error fetching screen:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error",
            error: error.message
        });
    }
});

// ✅ ADD A SCREEN (Access: Admin Only)
router.post("/", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { Cinema_ID, Screen_Category, Total_Seats } = req.body;

        if (!Cinema_ID || !Screen_Category || !Total_Seats) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide all screen details" 
            });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input("Cinema_ID", sql.Int, Cinema_ID)
            .input("Screen_Category", sql.VarChar, Screen_Category)
            .input("Total_Seats", sql.Int, Total_Seats)
            .query("INSERT INTO Screens (Cinema_ID, Screen_Category, Total_Seats) VALUES (@Cinema_ID, @Screen_Category, @Total_Seats)");

        res.status(201).json({ 
            success: true, 
            message: "Screen added successfully",
            rowsAffected: result.rowsAffected[0]
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add screen",
            error: error.message
        });
    }
});

router.put("/:Screen_ID", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { Screen_ID } = req.params;
        let { Screen_Category, Total_Seats, Seats_Available } = req.body;

        // Convert to numbers if they exist
        if (Total_Seats !== undefined) Total_Seats = parseInt(Total_Seats);
        if (Seats_Available !== undefined) Seats_Available = parseInt(Seats_Available);

        // Enhanced validation
        if (!Screen_Category && Total_Seats === undefined && Seats_Available === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: "At least one field is required to update" 
            });
        }

        // Validate numbers
        if (Total_Seats !== undefined && (isNaN(Total_Seats) || Total_Seats <= 0)) {
            return res.status(400).json({
                success: false,
                message: "Total_Seats must be a positive integer"
            });
        }

        if (Seats_Available !== undefined && (isNaN(Seats_Available) || Seats_Available < 0)) {
            return res.status(400).json({
                success: false,
                message: "Seats_Available must be a non-negative integer"
            });
        }

        // Additional validation for Seats_Available <= Total_Seats
        if (Total_Seats !== undefined && Seats_Available !== undefined && Seats_Available > Total_Seats) {
            return res.status(400).json({
                success: false,
                message: "Available seats cannot exceed total seats"
            });
        }

        // Database update logic
        const pool = await poolPromise;
        const request = pool.request();
        
        // Build dynamic update query
        let updateFields = [];
        request.input('Screen_ID', sql.Int, Screen_ID);

        if (Screen_Category) {
            updateFields.push("Screen_Category = @Screen_Category");
            request.input('Screen_Category', sql.VarChar, Screen_Category);
        }

        if (Total_Seats !== undefined) {
            updateFields.push("Total_Seats = @Total_Seats");
            request.input('Total_Seats', sql.Int, Total_Seats);
        }

        if (Seats_Available !== undefined) {
            updateFields.push("Seats_Available = @Seats_Available");
            request.input('Seats_Available', sql.Int, Seats_Available);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields provided for update"
            });
        }

        const query = `
            UPDATE Screens 
            SET ${updateFields.join(', ')}
            WHERE Screen_ID = @Screen_ID
        `;

        const result = await request.query(query);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: "Screen not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Screen updated successfully"
        });
        
    } catch (error) {
        console.error("Detailed error:", {
            message: error.message,
            stack: error.stack,
            sqlError: error.originalError?.info?.message
        });

        // Handle specific SQL errors
        if (error.originalError?.info?.message?.includes('FOREIGN KEY constraint')) {
            return res.status(400).json({
                success: false,
                message: "Invalid Screen_Category provided"
            });
        }

        if (error.originalError?.info?.message?.includes('CHECK constraint')) {
            return res.status(400).json({
                success: false,
                message: "Invalid seat values provided"
            });
        }

        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Error - " + error.message
        });
    }
});

// ✅ DELETE A SCREEN (Access: Admin Only)
router.delete("/:Screen_ID", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { Screen_ID } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input("Screen_ID", sql.Int, Screen_ID)
            .query("DELETE FROM Screens WHERE Screen_ID = @Screen_ID");

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Screen not found" 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: "Screen deleted successfully" 
        });
    } catch (error) {
        console.error("Error deleting screen:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error",
            error: error.message
        });
    }
});

module.exports = router;
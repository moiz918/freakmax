const express = require("express");
const { sql, poolPromise } = require("./db");
const { authenticateUser, authorizeRole } = require("./authMidware");

const router = express.Router();

// ✅ GET ALL SEATS (Access: User & Admin)
router.get("/", authenticateUser, authorizeRole("user", "admin"), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT Screen_ID, Seat_Number, Aisle, Seat_Type, Availability_Of_Seat 
            FROM Seats
        `);

        res.status(200).json({
            success: true,
            seats: result.recordset
        });
    } catch (error) {
        console.error("Error fetching seats:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});

// ✅ GET SEATS FOR A SPECIFIC SCREEN (Access: User & Admin)
router.get("/screen/:Screen_ID", authenticateUser, authorizeRole("user", "admin"), async (req, res) => {
    try {
        const { Screen_ID } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input("Screen_ID", sql.Int, Screen_ID)
            .query(`
                SELECT Screen_ID, Seat_Number, Aisle, Seat_Type, Availability_Of_Seat 
                FROM Seats 
                WHERE Screen_ID = @Screen_ID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "No seats found for this screen" 
            });
        }

        res.status(200).json({ 
            success: true, 
            seats: result.recordset 
        });
    } catch (error) {
        console.error("Error fetching seats:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: error.message
        });
    }
});

// ✅ GET SPECIFIC SEAT (Access: User & Admin)
router.get("/:Screen_ID/:Seat_Number/:Aisle", authenticateUser, authorizeRole("user", "admin"), async (req, res) => {
    try {
        const { Screen_ID, Seat_Number, Aisle } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input("Screen_ID", sql.Int, Screen_ID)
            .input("Seat_Number", sql.Int, Seat_Number)
            .input("Aisle", sql.Char, Aisle)
            .query(`
                SELECT Screen_ID, Seat_Number, Aisle, Seat_Type, Availability_Of_Seat 
                FROM Seats 
                WHERE Screen_ID = @Screen_ID 
                AND Seat_Number = @Seat_Number 
                AND Aisle = @Aisle
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Seat not found" 
            });
        }

        res.status(200).json({ 
            success: true, 
            seat: result.recordset[0] 
        });
    } catch (error) {
        console.error("Error fetching seat:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: error.message
        });
    }
});

// In your backend route file (e.g., seatRoutes.js)
router.post('/check-seat', async (req, res) => {
    console.log('Received check-seat request:', req.body); // Debug log
    try {
      const { Screen_ID, Seat_Number, Aisle } = req.body;
      
      const existingSeat = await Seat.findOne({
        where: {
          Screen_ID,
          Seat_Number,
          Aisle
        }
      });
  
      res.json({
        success: true,
        exists: !!existingSeat,
        seat: existingSeat
      });
    } catch (err) {
        console.log('Nai mili oye'); // Debug log
      res.status(500).json({
        
        success: false,
        message: err.message
      });
    }
  });

// In your seatRoutes.js
router.post("/", async (req, res) => {
    try {
        const { Screen_ID, Seat_Number, Aisle, Seat_Type, Availability_Of_Seat } = req.body;

        // Validate inputs (keep your existing validation)
        if (!Screen_ID || !Seat_Number || !Aisle) {
            return res.status(400).json({ 
                success: false, 
                message: "Screen_ID, Seat_Number and Aisle are required" 
            });
        }

        const pool = await poolPromise;

        // Use MERGE statement (SQL Server's UPSERT)
        const result = await pool.request()
            .input("Screen_ID", sql.Int, Screen_ID)
            .input("Seat_Number", sql.Int, Seat_Number)
            .input("Aisle", sql.Char, Aisle)
            .input("Seat_Type", sql.VarChar, Seat_Type || 'Gold')
            .input("Availability_Of_Seat", sql.VarChar, Availability_Of_Seat || 'Yes')
            .query(`
                MERGE INTO Seats AS target
                USING (VALUES (@Screen_ID, @Seat_Number, @Aisle, @Seat_Type, @Availability_Of_Seat)) 
                       AS source (Screen_ID, Seat_Number, Aisle, Seat_Type, Availability_Of_Seat)
                ON target.Screen_ID = source.Screen_ID 
                   AND target.Seat_Number = source.Seat_Number 
                   AND target.Aisle = source.Aisle
                WHEN NOT MATCHED THEN
                    INSERT (Screen_ID, Seat_Number, Aisle, Seat_Type, Availability_Of_Seat)
                    VALUES (source.Screen_ID, source.Seat_Number, source.Aisle, source.Seat_Type, source.Availability_Of_Seat);
            `);

        res.status(200).json({ 
            success: true, 
            message: "Seat processed successfully"
        });
    } catch (error) {
        console.error("Error processing seat:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to process seat",
            error: error.message
        });
    }
});

//UPDATE A SEAT
router.put("/:Screen_ID/:Seat_Number/:Aisle", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        // Convert parameters
        const Screen_ID = parseInt(req.params.Screen_ID);
        const Seat_Number = parseInt(req.params.Seat_Number);
        const Aisle = req.params.Aisle.toUpperCase();

        console.log("Screen_ID received:", req.params.Screen_ID);
        console.log("Parsed Screen_ID:", Screen_ID);

        // Validate parameters
        if (isNaN(Screen_ID) || Screen_ID <= 0) {
            return res.status(400).json({ success: false, message: "Screen_ID must be a positive number" });
        }
        if (isNaN(Seat_Number) || Seat_Number <= 0) {
            return res.status(400).json({ success: false, message: "Seat_Number must be a positive number" });
        }
        if (!/^[A-Z]$/.test(Aisle)) {
            return res.status(400).json({ success: false, message: "Aisle must be a single uppercase letter (A-Z)" });
        }

        const { Seat_Type, Availability_Of_Seat } = req.body;

        if (!Seat_Type && !Availability_Of_Seat) {
            return res.status(400).json({ success: false, message: "At least one field (Seat_Type or Availability_Of_Seat) is required" });
        }

        if (Availability_Of_Seat && !['Yes', 'No'].includes(Availability_Of_Seat)) {
            return res.status(400).json({ success: false, message: "Availability must be 'Yes' or 'No'" });
        }

        const pool = await poolPromise;
        const updates = [];
        const request = pool.request();

        request.input("Screen_ID", sql.Int, Screen_ID);
        request.input("Seat_Number", sql.Int, Seat_Number);
        request.input("Aisle", sql.Char, Aisle);
        if (Seat_Type) {
            updates.push("Seat_Type = @Seat_Type");
            request.input("Seat_Type", sql.VarChar, Seat_Type);
        }
        if (Availability_Of_Seat) {
            updates.push("Availability_Of_Seat = @Availability_Of_Seat");
            request.input("Availability_Of_Seat", sql.VarChar, Availability_Of_Seat);
        }

        const result = await request.query(`
            UPDATE Seats 
            SET ${updates.join(", ")} 
            WHERE Screen_ID = @Screen_ID 
            AND Seat_Number = @Seat_Number 
            AND Aisle = @Aisle
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Seat not found" });
        }

        res.status(200).json({ 
            success: true, 
            message: "Seat updated successfully",
            updatedFields: updates.map(update => update.split(' = ')[0])
        });

    } catch (error) {
        console.error("Error updating seat:", error);
        res.status(500).json({ success: false, message: "Failed to update seat", error: error.message });
    }
});


// ✅ DELETE A SEAT (Access: Admin Only)
router.delete("/:Screen_ID/:Seat_Number/:Aisle", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { Screen_ID, Seat_Number, Aisle } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input("Screen_ID", sql.Int, Screen_ID)
            .input("Seat_Number", sql.Int, Seat_Number)
            .input("Aisle", sql.Char, Aisle)
            .query(`
                DELETE FROM Seats 
                WHERE Screen_ID = @Screen_ID 
                AND Seat_Number = @Seat_Number 
                AND Aisle = @Aisle
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Seat not found" 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: "Seat deleted successfully" 
        });
    } catch (error) {
        console.error("Error deleting seat:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to delete seat",
            error: error.message
        });
    }
});

module.exports = router;
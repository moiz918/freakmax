const express = require("express");
const { sql, poolPromise } = require("./db");
const { authenticateUser, authorizeRole } = require("./authMidware"); //Import the Authorization from authMiddleware.js


const router = express.Router();



// GET /api/cinemas - Get all cinemas (Access: User & Admin)
router.get("/", authenticateUser, authorizeRole("user", "admin"), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM Cinema");

        res.status(200).json({
            success: true,
            cinemas: result.recordset,
        });
    } catch (error) {
        console.log(`Error`, error);
        res.status(500).json({
            success: false,
            message: "Server error, try again",
            error: error.message,
        });
    }
});

// GET /api/cinemas/:identifier - Get specific cinema (Access: User & Admin)
router.get("/:identifier", authenticateUser, authorizeRole("user", "admin"), async (req, res) => {
    try {
        const { identifier } = req.params;
        const pool = await poolPromise;
        let result;

        if (!isNaN(identifier)) {
            result = await pool
                .request()
                .input("Cinema_ID", sql.Int, identifier)
                .query("SELECT * FROM Cinema WHERE Cinema_ID = @Cinema_ID");
        } else {
            result = await pool
                .request()
                .input("Cinema_Name", sql.NVarChar, identifier)
                .query("SELECT * FROM Cinema WHERE Cinema_Name = @Cinema_Name");
        }

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Cinema not found",
            });
        }

        res.status(200).json({
            success: true,
            cinema: result.recordset[0],
        });
    } catch (error) {
        console.error("Error fetching cinema:", error);
        res.status(500).json({
            success: false,
            message: "Server error, try again",
            error: error.message,
        });
    }
});

// POST /api/cinemas - Add new cinema (Access: Admin Only)
router.post("/", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { Cinema_Name, Cinema_Location, Cinema_Number, Cinema_Email, Total_Screens } = req.body;

        if (!Cinema_Name || !Cinema_Location || !Cinema_Number || !Cinema_Email || !Total_Screens) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide all cinema details" 
            });
        }

        const pool = await poolPromise;
        const result = await pool
            .request()
            .input("Cinema_Name", sql.NVarChar, Cinema_Name)
            .input("Cinema_Location", sql.NVarChar, Cinema_Location)
            .input("Cinema_Number", sql.NVarChar, Cinema_Number)
            .input("Cinema_Email", sql.NVarChar, Cinema_Email)
            .input("Total_Screens", sql.Int, Total_Screens)
            .query(
                `INSERT INTO Cinema 
                (Cinema_Name, Cinema_Location, Cinema_Number, Cinema_Email, Total_Screens) 
                VALUES 
                (@Cinema_Name, @Cinema_Location, @Cinema_Number, @Cinema_Email, @Total_Screens)`
            );

        res.status(201).json({ 
            success: true, 
            message: "Cinema added successfully",
            rowsAffected: result.rowsAffected[0]
        });
    } catch (error) {
        console.error("Error adding cinema:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add cinema",
            error: error.message
        });
    }
});

// PUT /api/cinemas/:identifier - Update cinema (Access: Admin Only)
router.put("/:identifier", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { identifier } = req.params;
        const { Cinema_Name, Cinema_Location, Cinema_Number, Cinema_Email, Total_Screens } = req.body;

        if (!Cinema_Name || !Cinema_Location || !Cinema_Number || !Cinema_Email || !Total_Screens) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide all cinema details" 
            });
        }

        const pool = await poolPromise;
        let result;

        if (!isNaN(identifier)) {
            result = await pool
                .request()
                .input("Cinema_ID", sql.Int, identifier)
                .input("Cinema_Name", sql.NVarChar, Cinema_Name)
                .input("Cinema_Location", sql.NVarChar, Cinema_Location)
                .input("Cinema_Number", sql.NVarChar, Cinema_Number)
                .input("Cinema_Email", sql.NVarChar, Cinema_Email)
                .input("Total_Screens", sql.Int, Total_Screens)
                .query(
                    `UPDATE Cinema 
                    SET Cinema_Name=@Cinema_Name, 
                        Cinema_Location=@Cinema_Location, 
                        Cinema_Number=@Cinema_Number, 
                        Cinema_Email=@Cinema_Email, 
                        Total_Screens=@Total_Screens 
                    WHERE Cinema_ID=@Cinema_ID`
                );
        } else {
            result = await pool
                .request()
                .input("Cinema_Name", sql.NVarChar, identifier)
                .input("New_Cinema_Name", sql.NVarChar, Cinema_Name)
                .input("Cinema_Location", sql.NVarChar, Cinema_Location)
                .input("Cinema_Number", sql.NVarChar, Cinema_Number)
                .input("Cinema_Email", sql.NVarChar, Cinema_Email)
                .input("Total_Screens", sql.Int, Total_Screens)
                .query(
                    `UPDATE Cinema 
                    SET Cinema_Name=@New_Cinema_Name,
                        Cinema_Location=@Cinema_Location,
                        Cinema_Number=@Cinema_Number,
                        Cinema_Email=@Cinema_Email,
                        Total_Screens=@Total_Screens
                    WHERE Cinema_Name=@Cinema_Name`
                );
        }

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Cinema not found" 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: "Cinema updated successfully" 
        });
    } catch (error) {
        console.error("Error updating cinema:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update cinema",
            error: error.message
        });
    }
});

// DELETE /api/cinemas/:identifier - Delete cinema (Access: Admin Only)
router.delete("/:identifier", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { identifier } = req.params;
        const pool = await poolPromise;
        let result;

        if (!identifier) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid identifier" 
            });
        }

        if (!isNaN(identifier)) {
            result = await pool
                .request()
                .input("Cinema_ID", sql.Int, identifier)
                .query("DELETE FROM Cinema WHERE Cinema_ID = @Cinema_ID");
        } else {
            result = await pool
                .request()
                .input("Cinema_Name", sql.NVarChar, identifier)
                .query("DELETE FROM Cinema WHERE Cinema_Name = @Cinema_Name");
        }

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Cinema not found" 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: "Cinema deleted successfully" 
        });
    } catch (error) {
        console.error("Error deleting cinema:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete cinema",
            error: error.message
        });
    }
});

module.exports = router;
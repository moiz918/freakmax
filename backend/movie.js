const express = require("express");
const { sql, poolPromise } = require("./db");
const { authenticateUser, authorizeRole } = require("./authMidware"); //Import the Authorization from authMiddleware.js


const router = express.Router();

// ✅ GET All Movies (Access: User & Admin)
router.get("/", authenticateUser, authorizeRole("user", "admin"), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM Movies");

        res.status(200).json({
            success: true,
            movies: result.recordset,
        });
    } catch (error) {
        console.log("Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error, try again",
            error: error.message,
        });
    }
});

// ✅ GET Specific Movie (Access: User & Admin)
router.get("/:identifier", authenticateUser, authorizeRole("user", "admin"), async (req, res) => {
    try {
        const { identifier } = req.params;
        const pool = await poolPromise;
        let result;

        if (!isNaN(identifier)) {
            result = await pool
                .request()
                .input("Movie_ID", sql.Int, identifier)
                .query("SELECT * FROM Movies WHERE Movie_ID = @Movie_ID");
        } else {
            result = await pool
                .request()
                .input("Movie_Name", sql.NVarChar, identifier)
                .query("SELECT * FROM Movies WHERE Movie_Name = @Movie_Name");
        }

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Movie not found" });
        }

        res.status(200).json({ success: true, movie: result.recordset[0] });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: "Server error, try again", error: error.message });
    }
});

// ✅ ADD a New Movie (Access: Admin Only)
router.post("/", authenticateUser, authorizeRole("admin"), async (req, res) => {
    console.log("User making request:", req.user); // Debug the user object
  
    try {
        const { Movie_Name, Genre, Duration_Minutes, Rating, Children_Friendly, Release_Date } = req.body;

        if (!Movie_Name || !Genre || !Duration_Minutes || !Rating || !Children_Friendly || !Release_Date) {
            return res.status(400).json({ success: false, message: "Please provide all movie details" });
        }

        const pool = await poolPromise;
        const result = await pool
            .request()
            .input("Movie_Name", sql.VarChar, Movie_Name)
            .input("Genre", sql.VarChar, Genre)
            .input("Duration_Minutes", sql.Int, Duration_Minutes)
            .input("Rating", sql.Float, Rating)
            .input("Children_Friendly", sql.VarChar, Children_Friendly)
            .input("Release_Date", sql.Date, Release_Date)
            .query(
                `INSERT INTO Movies 
                 (Movie_Name, Genre, Duration_Minutes, Rating, Children_Friendly, Release_Date) 
                 VALUES 
                 (@Movie_Name, @Genre, @Duration_Minutes, @Rating, @Children_Friendly, @Release_Date)`
            );

        res.status(201).json({ success: true, message: "Movie added successfully", rowsAffected: result.rowsAffected[0] });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: "Failed to add movie", error: error.message });
    }
});

// ✅ UPDATE a Movie (Access: Admin Only)
router.put("/:identifier", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { identifier } = req.params;
        const { Movie_Name, Genre, Duration_Minutes, Rating, Children_Friendly, Release_Date } = req.body;

        if (!Movie_Name || !Genre || !Duration_Minutes || !Rating || !Children_Friendly || !Release_Date) {
            return res.status(400).json({ success: false, message: "Please provide all movie details" });
        }

        const pool = await poolPromise;
        let result;

        if (!isNaN(identifier)) {
            result = await pool
                .request()
                .input("Movie_ID", sql.Int, identifier)
                .input("Movie_Name", sql.VarChar, Movie_Name)
                .input("Genre", sql.VarChar, Genre)
                .input("Duration_Minutes", sql.Int, Duration_Minutes)
                .input("Rating", sql.Float, Rating)
                .input("Children_Friendly", sql.VarChar, Children_Friendly)
                .input("Release_Date", sql.Date, Release_Date)
                .query(
                    `UPDATE Movies 
                     SET Movie_Name = @Movie_Name, 
                         Genre = @Genre, 
                         Duration_Minutes = @Duration_Minutes, 
                         Rating = @Rating, 
                         Children_Friendly = @Children_Friendly, 
                         Release_Date = @Release_Date 
                     WHERE Movie_ID = @Movie_ID`
                );
        } else {
            result = await pool
                .request()
                .input("Movie_Name", sql.VarChar, identifier)
                .input("New_Movie_Name", sql.VarChar, Movie_Name)
                .input("Genre", sql.VarChar, Genre)
                .input("Duration_Minutes", sql.Int, Duration_Minutes)
                .input("Rating", sql.Float, Rating)
                .input("Children_Friendly", sql.VarChar, Children_Friendly)
                .input("Release_Date", sql.Date, Release_Date)
                .query(
                    `UPDATE Movies 
                     SET Movie_Name = @New_Movie_Name, 
                         Genre = @Genre, 
                         Duration_Minutes = @Duration_Minutes, 
                         Rating = @Rating, 
                         Children_Friendly = @Children_Friendly, 
                         Release_Date = @Release_Date 
                     WHERE Movie_Name = @Movie_Name`
                );
        }

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Movie not found" });
        }

        res.status(200).json({ success: true, message: "Movie updated successfully" });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: "Server error, try again", error: error.message });
    }
});

// ✅ DELETE a Movie (Access: Admin Only)
router.delete("/:identifier", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { identifier } = req.params;
        const pool = await poolPromise;
        let result;

        if (!identifier) {
            return res.status(400).json({ success: false, message: "Invalid identifier" });
        }

        if (!isNaN(identifier)) {
            result = await pool
                .request()
                .input("Movie_ID", sql.Int, identifier)
                .query("DELETE FROM Movies WHERE Movie_ID = @Movie_ID");
        } else {
            result = await pool
                .request()
                .input("Movie_Name", sql.NVarChar, identifier)
                .query("DELETE FROM Movies WHERE Movie_Name = @Movie_Name");
        }

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Movie not found" });
        }

        res.status(200).json({ success: true, message: "Movie deleted successfully" });
    } catch (error) {
        console.error("Error deleting movie:", error);
        res.status(500).json({ success: false, message: "Server error, try again", error: error.message });
    }
});

module.exports = router;

const express = require("express");
const { sql, poolPromise } = require("./db");
const { authenticateUser, authorizeRole } = require("./authMidware");

const router = express.Router();

// ✅ GET ALL SEATS BOOKING (Admin only)
router.get("/", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT sb.*, 
                   b.User_ID,
                   u.User_Name,
                   c.Cinema_Name,
                   m.Movie_Name,
                   st.Show_Time,
                   st.Show_Date
            FROM Seats_Booking sb
            JOIN Bookings b ON sb.Booking_ID = b.Booking_ID
            JOIN Users u ON b.User_ID = u.User_ID
            JOIN Cinema c ON b.Cinema_ID = c.Cinema_ID
            JOIN Show_Timings st ON b.Show_ID = st.Show_ID
            JOIN Movies m ON st.Movie_ID = m.Movie_ID
        `);

        res.status(200).json({
            success: true,
            seatsBooking: result.recordset
        });
    } catch (error) {
        console.error("Error fetching seats booking:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching seat bookings",
            error: error.message
        });
    }
});

// ✅ GET SPECIFIC SEAT BOOKING (Admin or user's own booking)
router.get("/:Screen_ID/:Seat_Number/:Aisle/:Booking_ID", authenticateUser, async (req, res) => {
    try {
        const { Screen_ID, Seat_Number, Aisle, Booking_ID } = req.params;
        const pool = await poolPromise;

        // First get the booking to verify ownership
        const bookingResult = await pool.request()
            .input("Booking_ID", sql.Int, Booking_ID)
            .query(`
                SELECT b.User_ID 
                FROM Bookings b
                WHERE b.Booking_ID = @Booking_ID
            `);

        if (bookingResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const booking = bookingResult.recordset[0];
        
        // Authorization check
        if (req.user.role !== "admin" && booking.User_ID !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized - You can only view your own bookings"
            });
        }

        const result = await pool.request()
            .input("Screen_ID", sql.Int, Screen_ID)
            .input("Seat_Number", sql.Int, Seat_Number)
            .input("Aisle", sql.Char, Aisle)
            .input("Booking_ID", sql.Int, Booking_ID)
            .query(`
                SELECT sb.*, 
                       b.User_ID,
                       u.User_Name,
                       c.Cinema_Name,
                       m.Movie_Name,
                       st.Show_Time,
                       st.Show_Date
                FROM Seats_Booking sb
                JOIN Bookings b ON sb.Booking_ID = b.Booking_ID
                JOIN Users u ON b.User_ID = u.User_ID
                JOIN Cinema c ON b.Cinema_ID = c.Cinema_ID
                JOIN Show_Timings st ON b.Show_ID = st.Show_ID
                JOIN Movies m ON st.Movie_ID = m.Movie_ID
                WHERE sb.Screen_ID = @Screen_ID 
                AND sb.Seat_Number = @Seat_Number 
                AND sb.Aisle = @Aisle 
                AND sb.Booking_ID = @Booking_ID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Seat booking not found"
            });
        }

        res.status(200).json({
            success: true,
            seatBooking: result.recordset[0]
        });
    } catch (error) {
        console.error("Error fetching seat booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch seat booking",
            error: error.message
        });
    }
});

// ✅ ADD A SEAT BOOKING (User only - for their own bookings)
router.post("/", authenticateUser, authorizeRole("user"), async (req, res) => {
    try {
        const { Screen_ID, Seat_Number, Aisle, Booking_ID } = req.body;
        const User_ID = req.user.id;

        if (!Screen_ID || !Seat_Number || !Aisle || !Booking_ID) {
            return res.status(400).json({
                success: false,
                message: "Screen ID, Seat Number, Aisle, and Booking ID are required"
            });
        }

        const pool = await poolPromise;

        // Verify booking belongs to the user
        const bookingCheck = await pool.request()
            .input("Booking_ID", sql.Int, Booking_ID)
            .query(`
                SELECT User_ID FROM Bookings 
                WHERE Booking_ID = @Booking_ID
            `);

        if (bookingCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (bookingCheck.recordset[0].User_ID !== User_ID) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized - You can only add seats to your own bookings"
            });
        }

        // Verify seat availability
        const seatCheck = await pool.request()
            .input("Screen_ID", sql.Int, Screen_ID)
            .input("Seat_Number", sql.Int, Seat_Number)
            .input("Aisle", sql.Char, Aisle)
            .query(`
                SELECT Availability_Of_Seat 
                FROM Seats 
                WHERE Screen_ID = @Screen_ID 
                AND Seat_Number = @Seat_Number 
                AND Aisle = @Aisle
            `);

        if (seatCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Seat not found"
            });
        }

        if (seatCheck.recordset[0].Availability_Of_Seat !== 'Yes') {
            return res.status(400).json({
                success: false,
                message: "Seat is not available"
            });
        }

        // Start transaction
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Calculate total price
            const priceResult = await new sql.Request(transaction)
                .input("Screen_ID", sql.Int, Screen_ID)
                .input("Seat_ID", sql.Int, Seat_Number)
                .input("Aisle", sql.Char, Aisle)
                .query(`
                    SELECT (sc.Screen_Price + st.Seat_Price) AS Total_Price
                    FROM Seats s
                    JOIN Screens scr ON s.Screen_ID = scr.Screen_ID
                    JOIN Screen_Categories sc ON scr.Screen_Category = sc.Screen_Category
                    JOIN Seat_Types st ON s.Seat_Type = st.Seat_Type
                    WHERE s.Screen_ID = @Screen_ID 
                    AND s.Seat_Number = @Seat_ID
                    AND s.Aisle = @Aisle
                `);

            const totalPrice = priceResult.recordset[0].Total_Price;

            // Create seat booking
            await new sql.Request(transaction)
                .input("Screen_ID", sql.Int, Screen_ID)
                .input("Seat_Number", sql.Int, Seat_Number)
                .input("Aisle", sql.Char, Aisle)
                .input("Booking_ID", sql.Int, Booking_ID)
                .input("Total_Price", sql.Int, totalPrice)
                .query(`
                    INSERT INTO Seats_Booking 
                    (Screen_ID, Seat_Number, Aisle, Booking_ID, Total_Price)
                    VALUES (@Screen_ID, @Seat_Number, @Aisle, @Booking_ID, @Total_Price)
                `);

            // Update seat availability
            await new sql.Request(transaction)
                .input("Screen_ID", sql.Int, Screen_ID)
                .input("Seat_Number", sql.Int, Seat_Number)
                .input("Aisle", sql.Char, Aisle)
                .query(`
                    UPDATE Seats 
                    SET Availability_Of_Seat = 'No'
                    WHERE Screen_ID = @Screen_ID 
                    AND Seat_Number = @Seat_Number 
                    AND Aisle = @Aisle
                `);

            // Commit transaction
            await transaction.commit();

            res.status(201).json({
                success: true,
                message: "Seat booked successfully",
                totalPrice
            });

        } catch (error) {
            // Rollback on error
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error("Error booking seat:", error);
        res.status(500).json({
            success: false,
            message: "Failed to book seat",
            error: error.message
        });
    }
});

// ✅ UPDATE SEAT BOOKING (User only - for their own bookings)
router.put("/:Screen_ID/:Seat_Number/:Aisle/:Booking_ID", authenticateUser, authorizeRole("user"), async (req, res) => {
    try {
        const { Screen_ID, Seat_Number, Aisle, Booking_ID } = req.params;
        const { Total_Price } = req.body;
        const User_ID = req.user.id;

        if (Total_Price === undefined || Total_Price <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Total_Price is required"
            });
        }

        const pool = await poolPromise;

        // Verify booking belongs to the user
        const bookingCheck = await pool.request()
            .input("Booking_ID", sql.Int, Booking_ID)
            .query(`
                SELECT User_ID FROM Bookings 
                WHERE Booking_ID = @Booking_ID
            `);

        if (bookingCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (bookingCheck.recordset[0].User_ID !== User_ID) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized - You can only update seats in your own bookings"
            });
        }

        const result = await pool.request()
            .input("Screen_ID", sql.Int, Screen_ID)
            .input("Seat_Number", sql.Int, Seat_Number)
            .input("Aisle", sql.Char, Aisle)
            .input("Booking_ID", sql.Int, Booking_ID)
            .input("Total_Price", sql.Int, Total_Price)
            .query(`
                UPDATE Seats_Booking 
                SET Total_Price = @Total_Price
                WHERE Screen_ID = @Screen_ID 
                AND Seat_Number = @Seat_Number 
                AND Aisle = @Aisle 
                AND Booking_ID = @Booking_ID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: "Seat booking not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Seat booking updated successfully"
        });
    } catch (error) {
        console.error("Error updating seat booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update seat booking",
            error: error.message
        });
    }
});

// ✅ DELETE SEAT BOOKING (User only - for their own bookings)
router.delete("/:Screen_ID/:Seat_Number/:Aisle/:Booking_ID", authenticateUser, authorizeRole("user"), async (req, res) => {
    try {
        const { Screen_ID, Seat_Number, Aisle, Booking_ID } = req.params;
        const User_ID = req.user.id;
        const pool = await poolPromise;

        // Verify booking belongs to the user
        const bookingCheck = await pool.request()
            .input("Booking_ID", sql.Int, Booking_ID)
            .query(`
                SELECT User_ID FROM Bookings 
                WHERE Booking_ID = @Booking_ID
            `);

        if (bookingCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (bookingCheck.recordset[0].User_ID !== User_ID) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized - You can only delete seats from your own bookings"
            });
        }

        // Start transaction
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Delete seat booking
            const deleteResult = await new sql.Request(transaction)
                .input("Screen_ID", sql.Int, Screen_ID)
                .input("Seat_Number", sql.Int, Seat_Number)
                .input("Aisle", sql.Char, Aisle)
                .input("Booking_ID", sql.Int, Booking_ID)
                .query(`
                    DELETE FROM Seats_Booking 
                    WHERE Screen_ID = @Screen_ID 
                    AND Seat_Number = @Seat_Number 
                    AND Aisle = @Aisle 
                    AND Booking_ID = @Booking_ID
                `);

            if (deleteResult.rowsAffected[0] === 0) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: "Seat booking not found"
                });
            }

            // Update seat availability
            await new sql.Request(transaction)
                .input("Screen_ID", sql.Int, Screen_ID)
                .input("Seat_Number", sql.Int, Seat_Number)
                .input("Aisle", sql.Char, Aisle)
                .query(`
                    UPDATE Seats 
                    SET Availability_Of_Seat = 'Yes'
                    WHERE Screen_ID = @Screen_ID 
                    AND Seat_Number = @Seat_Number 
                    AND Aisle = @Aisle
                `);

            // Commit transaction
            await transaction.commit();

            res.status(200).json({
                success: true,
                message: "Seat booking deleted successfully"
            });

        } catch (error) {
            // Rollback on error
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error("Error deleting seat booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete seat booking",
            error: error.message
        });
    }
});

module.exports = router;
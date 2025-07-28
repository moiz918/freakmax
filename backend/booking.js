const express = require("express");
const { sql, poolPromise } = require("./db");
const { authenticateUser, authorizeRole } = require("./authMidware");

const router = express.Router();

// ✅ GET ALL BOOKINGS (Admin sees all, user sees only their own)
router.get("/", authenticateUser, async (req, res) => {
    try {
        const pool = await poolPromise;
        let query = "";
        let params = {};

        if (req.user.role === "admin") {
            query = `
                SELECT b.*, u.User_Name, u.User_Email, c.Cinema_Name, m.Movie_Name,st.Show_Time
                FROM Bookings b
                JOIN Users u ON b.User_ID = u.User_ID
                JOIN Cinema c ON b.Cinema_ID = c.Cinema_ID
                JOIN Show_Timings st ON b.Show_ID = st.Show_ID
                JOIN Movies m ON st.Movie_ID = m.Movie_ID
                ORDER BY b.Booking_Time DESC
            `;
        } else {
            query = `
                SELECT b.*, u.User_Name, u.User_Email, c.Cinema_Name, m.Movie_Name
                FROM Bookings b
                JOIN Users u ON b.User_ID = u.User_ID
                JOIN Cinema c ON b.Cinema_ID = c.Cinema_ID
                JOIN Show_Timings st ON b.Show_ID = st.Show_ID
                JOIN Movies m ON st.Movie_ID = m.Movie_ID
                WHERE b.User_ID = @User_ID
                ORDER BY b.Booking_Time DESC
            `;
            params = { User_ID: req.user.id };
        }

        const request = pool.request();
        Object.keys(params).forEach(key => {
            request.input(key, sql.Int, params[key]);
        });

        const result = await request.query(query);

        res.status(200).json({
            success: true,
            bookings: result.recordset
        });
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching bookings",
            error: error.message
        });
    }
});

// ✅ GET SPECIFIC BOOKING (Admin or user's own booking)
router.get("/:Booking_ID", authenticateUser, async (req, res) => {
    try {
        const { Booking_ID } = req.params;
        const pool = await poolPromise;

        // First get the booking to verify ownership
        const bookingResult = await pool.request()
            .input("Booking_ID", sql.Int, Booking_ID)
            .query(` SELECT 
                    b.Booking_ID,
                    b.Booking_Time,
                    b.Booking_Status,
                    c.Cinema_Name,
                    m.Movie_Name,
                    st.Show_Time  
                FROM Bookings b
                JOIN Cinema c ON b.Cinema_ID = c.Cinema_ID
                JOIN Show_Timings st ON b.Show_ID = st.Show_ID
                JOIN Movies m ON st.Movie_ID = m.Movie_ID
                WHERE b.User_ID = @User_ID
                ORDER BY b.Booking_Time DESC
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

        // Get full booking details
        const detailedResult = await pool.request()
            .input("Booking_ID", sql.Int, Booking_ID)
            .query(`
                SELECT 
                    b.Booking_ID,
                    b.Booking_Time,
                    b.Booking_Status,
                    u.User_Name,
                    u.User_Email,
                    c.Cinema_Name,
                    m.Movie_Name,
                    st.Show_Time,
                    st.Show_Date,
                    p.Amount AS Total_Price,
                    p.Payment_Method
                FROM Bookings b
                JOIN Users u ON b.User_ID = u.User_ID
                JOIN Cinema c ON b.Cinema_ID = c.Cinema_ID
                JOIN Show_Timings st ON b.Show_ID = st.Show_ID
                JOIN Movies m ON st.Movie_ID = m.Movie_ID
                LEFT JOIN Payments p ON b.Booking_ID = p.Booking_ID
                WHERE b.Booking_ID = @Booking_ID
            `);

        res.status(200).json({
            success: true,
            booking: detailedResult.recordset[0]
        });
    } catch (error) {
        console.error("Error fetching booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch booking",
            error: error.message
        });
    }
});


// ✅ GET BOOKING AMOUNT (Calculate total from seats for a booking)
router.get("/:bookingId/amount", authenticateUser, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user.id; // Get from authenticated user

        const pool = await poolPromise;

        // First verify the booking belongs to the requesting user
        const bookingCheck = await pool.request()
            .input("Booking_ID", sql.Int, bookingId)
            .query(`
                SELECT User_ID 
                FROM Bookings 
                WHERE Booking_ID = @Booking_ID
            `);

        if (bookingCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (bookingCheck.recordset[0].User_ID !== userId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized - You can only view your own bookings"
            });
        }

        // Calculate total amount from booked seats
        const amountResult = await pool.request()
            .input("Booking_ID", sql.Int, bookingId)
            .query(`
                SELECT 
                    SUM(sb.Total_Price) AS Total,
                    COUNT(sb.Seat_Number) AS SeatCount,
                    STRING_AGG(CONCAT(sb.Aisle, sb.Seat_Number), ', ') AS SeatNumbers
                FROM Seats_Booking sb
                WHERE sb.Booking_ID = @Booking_ID
            `);

        if (!amountResult.recordset[0].Total) {
            return res.status(400).json({
                success: false,
                message: "No seats found for this booking"
            });
        }

        res.status(200).json({
            success: true,
            total: amountResult.recordset[0].Total,
            seatCount: amountResult.recordset[0].SeatCount,
            seatNumbers: amountResult.recordset[0].SeatNumbers
        });

    } catch (error) {
        console.error("Error calculating booking amount:", error);
        res.status(500).json({
            success: false,
            message: "Failed to calculate booking amount",
            error: error.message
        });
    }
});


// ✅ ADD A BOOKING (Authenticated users only)
router.post("/", authenticateUser, async (req, res) => {
    try {
        const { Cinema_ID, Show_ID } = req.body;
        const User_ID = req.user.id; // Get from authenticated user

        if (!Cinema_ID || !Show_ID) {
            return res.status(400).json({
                success: false,
                message: "Cinema ID and Show ID are required"
            });
        }

        const pool = await poolPromise;

        // Verify show exists and is in the future
        const showCheck = await pool.request()
            .input("Show_ID", sql.Int, Show_ID)
            .query(`
                SELECT Show_ID FROM Show_Timings 
                WHERE Show_ID = @Show_ID
                AND Show_Date >= CAST(GETDATE() AS DATE)
            `);

        if (showCheck.recordset.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Show not found or has already occurred"
            });
        }

        // Create booking
        const result = await pool.request()
            .input("User_ID", sql.Int, User_ID)
            .input("Cinema_ID", sql.Int, Cinema_ID)
            .input("Show_ID", sql.Int, Show_ID)
            .input("Booking_Status", sql.VarChar, "Pending")
            .query(`
                INSERT INTO Bookings 
                (User_ID, Cinema_ID, Show_ID, Booking_Status, Booking_Time)
                OUTPUT INSERTED.Booking_ID, INSERTED.Booking_Time
                VALUES (@User_ID, @Cinema_ID, @Show_ID, @Booking_Status, CONVERT(TIME, GETDATE()))
            `);

        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            bookingId: result.recordset[0].Booking_ID,
            bookingTime: result.recordset[0].Booking_Time
        });
    } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create booking",
            error: error.message
        });
    }
});







// ✅ UPDATE BOOKING (User can update own, admin can update any)
router.put("/:Booking_ID", authenticateUser, async (req, res) => {
    try {
        const { Booking_ID } = req.params;
        const { Booking_Status } = req.body;
        const pool = await poolPromise;

        // First get the booking to verify ownership
        const bookingResult = await pool.request()
            .input("Booking_ID", sql.Int, Booking_ID)
            .query(`
                SELECT User_ID FROM Bookings 
                WHERE Booking_ID = @Booking_ID
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
                message: "Unauthorized - You can only update your own bookings"
            });
        }

        // Validate status
        if (!['Pending', 'Complete', 'Cancelled'].includes(Booking_Status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Booking_Status value"
            });
        }

        const updateResult = await pool.request()
            .input("Booking_ID", sql.Int, Booking_ID)
            .input("Booking_Status", sql.VarChar, Booking_Status)
            .query(`
                UPDATE Bookings 
                SET Booking_Status = @Booking_Status
                WHERE Booking_ID = @Booking_ID
            `);

        res.status(200).json({
            success: true,
            message: "Booking updated successfully"
        });
    } catch (error) {
        console.error("Error updating booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update booking",
            error: error.message
        });
    }
});

// ✅ DELETE BOOKING (User can delete own, admin can delete any)
router.delete("/:Booking_ID", authenticateUser, async (req, res) => {
    try {
        const { Booking_ID } = req.params;
        const pool = await poolPromise;

        // First get the booking to verify ownership
        const bookingResult = await pool.request()
            .input("Booking_ID", sql.Int, Booking_ID)
            .query(`
                SELECT User_ID FROM Bookings 
                WHERE Booking_ID = @Booking_ID
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
                message: "Unauthorized - You can only delete your own bookings"
            });
        }

        const deleteResult = await pool.request()
            .input("Booking_ID", sql.Int, Booking_ID)
            .query("DELETE FROM Bookings WHERE Booking_ID = @Booking_ID");

        res.status(200).json({
            success: true,
            message: "Booking deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete booking",
            error: error.message
        });
    }
});

module.exports = router;
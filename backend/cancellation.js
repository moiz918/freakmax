const express = require("express");
const { sql, poolPromise } = require("./db");
const { authenticateUser, authorizeRole } = require("./authMidware");

const router = express.Router();

// ✅ GET ALL CANCELLATIONS (Admin only)
router.get("/", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT c.*, 
                   b.User_ID,
                   u.User_Name,
                   u.User_Email,
                   m.Movie_Name,
                   st.Show_Date,
                   st.Show_Time
            FROM Cancellations c
            JOIN Bookings b ON c.Booking_ID = b.Booking_ID
            JOIN Users u ON b.User_ID = u.User_ID
            JOIN Show_Timings st ON b.Show_ID = st.Show_ID
            JOIN Movies m ON st.Movie_ID = m.Movie_ID
            ORDER BY c.Cancellation_ID DESC
        `);

        res.status(200).json({
            success: true,
            cancellations: result.recordset
        });
    } catch (error) {
        console.error("Error fetching cancellations:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching cancellations",
            error: error.message
        });
    }
});

// ✅ GET SPECIFIC CANCELLATION (Admin or user's own cancellation)
router.get("/:Cancellation_ID", authenticateUser, async (req, res) => {
    try {
        const { Cancellation_ID } = req.params;
        const pool = await poolPromise;

        // First get the cancellation with booking info to verify ownership
        const cancellationResult = await pool.request()
            .input("Cancellation_ID", sql.Int, Cancellation_ID)
            .query(`
                SELECT c.*, b.User_ID 
                FROM Cancellations c
                JOIN Bookings b ON c.Booking_ID = b.Booking_ID
                WHERE c.Cancellation_ID = @Cancellation_ID
            `);

        if (cancellationResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Cancellation not found"
            });
        }

        const cancellation = cancellationResult.recordset[0];
        
        // Authorization check
        if (req.user.role !== "admin" && cancellation.User_ID !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized - You can only view your own cancellations"
            });
        }

        // Get full cancellation details
        const detailedResult = await pool.request()
            .input("Cancellation_ID", sql.Int, Cancellation_ID)
            .query(`
                SELECT 
                    c.*,
                    b.Booking_Time,
                    b.Booking_Status,
                    u.User_Name,
                    u.User_Email,
                    m.Movie_Name,
                    st.Show_Date,
                    st.Show_Time,
                    p.Payment_Method,
                    p.Payment_Status
                FROM Cancellations c
                JOIN Bookings b ON c.Booking_ID = b.Booking_ID
                JOIN Users u ON b.User_ID = u.User_ID
                JOIN Show_Timings st ON b.Show_ID = st.Show_ID
                JOIN Movies m ON st.Movie_ID = m.Movie_ID
                LEFT JOIN Payments p ON b.Booking_ID = p.Booking_ID
                WHERE c.Cancellation_ID = @Cancellation_ID
            `);

        res.status(200).json({
            success: true,
            cancellation: detailedResult.recordset[0]
        });
    } catch (error) {
        console.error("Error fetching cancellation:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch cancellation",
            error: error.message
        });
    }
});

// ✅ ADD A CANCELLATION (User only - for their own bookings)
router.post("/", authenticateUser, authorizeRole("user"), async (req, res) => {
    try {
        const { Booking_ID } = req.body;
        const User_ID = req.user.id;

        if (!Booking_ID) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required"
            });
        }

        const pool = await poolPromise;

        // Verify booking belongs to the user
        const bookingCheck = await pool.request()
            .input("Booking_ID", sql.Int, Booking_ID)
            .query(`
                SELECT User_ID, Booking_Status 
                FROM Bookings 
                WHERE Booking_ID = @Booking_ID
            `);

        if (bookingCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const booking = bookingCheck.recordset[0];
        
        if (booking.User_ID !== User_ID) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized - You can only cancel your own bookings"
            });
        }

        if (booking.Booking_Status === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: "Booking is already cancelled"
            });
        }

        // Calculate refund amount (80% of total payment)
        const paymentResult = await pool.request()
            .input("Booking_ID", sql.Int, Booking_ID)
            .query(`
                SELECT Amount 
                FROM Payments 
                WHERE Booking_ID = @Booking_ID
                AND Payment_Status = 'Completed'
            `);

        if (paymentResult.recordset.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No completed payment found for this booking"
            });
        }

        const Refund_Amount = Math.floor(paymentResult.recordset[0].Amount * 0.8);

        // Start transaction
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Create cancellation record
            const cancellationResult = await new sql.Request(transaction)
                .input("Booking_ID", sql.Int, Booking_ID)
                .input("Refund_Amount", sql.Int, Refund_Amount)
                .query(`
                    INSERT INTO Cancellations 
                    (Booking_ID, Refund_Amount)
                    OUTPUT INSERTED.Cancellation_ID
                    VALUES (@Booking_ID, @Refund_Amount)
                `);

            // Update booking status
            await new sql.Request(transaction)
                .input("Booking_ID", sql.Int, Booking_ID)
                .input("Booking_Status", sql.VarChar, "Cancelled")
                .query(`
                    UPDATE Bookings 
                    SET Booking_Status = @Booking_Status
                    WHERE Booking_ID = @Booking_ID
                `);

            // Update payment status
            await new sql.Request(transaction)
                .input("Booking_ID", sql.Int, Booking_ID)
                .query(`
                    UPDATE Payments 
                    SET Payment_Status = 'Refunded'
                    WHERE Booking_ID = @Booking_ID
                `);

            // Free up seats
            await new sql.Request(transaction)
                .input("Booking_ID", sql.Int, Booking_ID)
                .query(`
                    UPDATE Seats
                    SET Availability_Of_Seat = 'Yes'
                    WHERE Seat_ID IN (
                        SELECT sb.Seat_ID
                        FROM Seats_Booking sb
                        WHERE sb.Booking_ID = @Booking_ID
                    )
                `);

            // Commit transaction
            await transaction.commit();

            res.status(201).json({
                success: true,
                message: "Booking cancelled successfully",
                cancellationId: cancellationResult.recordset[0].Cancellation_ID,
                refundAmount: Refund_Amount
            });

        } catch (error) {
            // Rollback on error
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error("Error creating cancellation:", error);
        res.status(500).json({
            success: false,
            message: "Failed to cancel booking",
            error: error.message
        });
    }
});

// ✅ UPDATE CANCELLATION (User only - for their own bookings)
router.put("/:Cancellation_ID", authenticateUser, authorizeRole("user"), async (req, res) => {
    try {
        const { Cancellation_ID } = req.params;
        const { Refund_Amount } = req.body;
        const User_ID = req.user.id;

        if (Refund_Amount === undefined || Refund_Amount < 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Refund Amount is required"
            });
        }

        const pool = await poolPromise;

        // Verify cancellation belongs to the user
        const cancellationCheck = await pool.request()
            .input("Cancellation_ID", sql.Int, Cancellation_ID)
            .query(`
                SELECT c.*, b.User_ID 
                FROM Cancellations c
                JOIN Bookings b ON c.Booking_ID = b.Booking_ID
                WHERE c.Cancellation_ID = @Cancellation_ID
            `);

        if (cancellationCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Cancellation not found"
            });
        }

        const cancellation = cancellationCheck.recordset[0];
        
        if (cancellation.User_ID !== User_ID) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized - You can only update your own cancellations"
            });
        }

        const result = await pool.request()
            .input("Cancellation_ID", sql.Int, Cancellation_ID)
            .input("Refund_Amount", sql.Int, Refund_Amount)
            .query(`
                UPDATE Cancellations 
                SET Refund_Amount = @Refund_Amount
                WHERE Cancellation_ID = @Cancellation_ID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: "Cancellation not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Cancellation updated successfully"
        });
    } catch (error) {
        console.error("Error updating cancellation:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update cancellation",
            error: error.message
        });
    }
});

// ✅ DELETE CANCELLATION (User only - for their own bookings)
router.delete("/:Cancellation_ID", authenticateUser, authorizeRole("user"), async (req, res) => {
    try {
        const { Cancellation_ID } = req.params;
        const User_ID = req.user.id;
        const pool = await poolPromise;

        // Verify cancellation belongs to the user
        const cancellationCheck = await pool.request()
            .input("Cancellation_ID", sql.Int, Cancellation_ID)
            .query(`
                SELECT c.*, b.User_ID, b.Booking_Status 
                FROM Cancellations c
                JOIN Bookings b ON c.Booking_ID = b.Booking_ID
                WHERE c.Cancellation_ID = @Cancellation_ID
            `);

        if (cancellationCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Cancellation not found"
            });
        }

        const cancellation = cancellationCheck.recordset[0];
        
        if (cancellation.User_ID !== User_ID) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized - You can only delete your own cancellations"
            });
        }

        // Start transaction
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Delete cancellation
            const deleteResult = await new sql.Request(transaction)
                .input("Cancellation_ID", sql.Int, Cancellation_ID)
                .query(`
                    DELETE FROM Cancellations 
                    WHERE Cancellation_ID = @Cancellation_ID
                `);

            if (deleteResult.rowsAffected[0] === 0) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: "Cancellation not found"
                });
            }

            // Revert booking status if needed
            await new sql.Request(transaction)
                .input("Booking_ID", sql.Int, cancellation.Booking_ID)
                .input("Booking_Status", sql.VarChar, "Complete")
                .query(`
                    UPDATE Bookings 
                    SET Booking_Status = @Booking_Status
                    WHERE Booking_ID = @Booking_ID
                `);

            // Revert payment status if needed
            await new sql.Request(transaction)
                .input("Booking_ID", sql.Int, cancellation.Booking_ID)
                .query(`
                    UPDATE Payments 
                    SET Payment_Status = 'Completed'
                    WHERE Booking_ID = @Booking_ID
                `);

            // Re-reserve seats if needed
            await new sql.Request(transaction)
                .input("Booking_ID", sql.Int, cancellation.Booking_ID)
                .query(`
                    UPDATE Seats
                    SET Availability_Of_Seat = 'No'
                    WHERE Seat_ID IN (
                        SELECT sb.Seat_ID
                        FROM Seats_Booking sb
                        WHERE sb.Booking_ID = @Booking_ID
                    )
                `);

            // Commit transaction
            await transaction.commit();

            res.status(200).json({
                success: true,
                message: "Cancellation deleted and booking restored successfully"
            });

        } catch (error) {
            // Rollback on error
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error("Error deleting cancellation:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete cancellation",
            error: error.message
        });
    }
});


module.exports = router;
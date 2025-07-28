const express = require("express");
const { sql, poolPromise } = require("./db");
const { authenticateUser, authorizeRole } = require("./authMidware");

const router = express.Router();

// ✅ GET ALL PAYMENTS (Admin sees all, user sees only their own)
router.get("/", authenticateUser, async (req, res) => {
    try {
        const pool = await poolPromise;
        let query = "";
        let params = {};

        if (req.user.role === "admin") {
            query = `
                SELECT p.*, 
                       b.User_ID,
                       u.User_Name,
                       u.User_Email,
                       c.Cinema_Name,
                       m.Movie_Name,
                       st.Show_Date,
                       st.Show_Time
                FROM Payments p
                JOIN Bookings b ON p.Booking_ID = b.Booking_ID
                JOIN Users u ON b.User_ID = u.User_ID
                JOIN Cinema c ON b.Cinema_ID = c.Cinema_ID
                JOIN Show_Timings st ON b.Show_ID = st.Show_ID
                JOIN Movies m ON st.Movie_ID = m.Movie_ID
                ORDER BY p.Payment_ID DESC
            `;
        } else {
            query = `
                SELECT p.*, 
                       b.User_ID,
                       u.User_Name,
                       u.User_Email,
                       c.Cinema_Name,
                       m.Movie_Name,
                       st.Show_Date,
                       st.Show_Time
                FROM Payments p
                JOIN Bookings b ON p.Booking_ID = b.Booking_ID
                JOIN Users u ON b.User_ID = u.User_ID
                JOIN Cinema c ON b.Cinema_ID = c.Cinema_ID
                JOIN Show_Timings st ON b.Show_ID = st.Show_ID
                JOIN Movies m ON st.Movie_ID = m.Movie_ID
                WHERE b.User_ID = @id
                ORDER BY p.Payment_ID DESC
            `;
            params = { id: req.user.id };
        }

        const request = pool.request();
        Object.keys(params).forEach(key => {
            request.input(key, sql.Int, params[key]);
        });

        const result = await request.query(query);

        res.status(200).json({
            success: true,
            payments: result.recordset
        });
    } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching payments",
            error: error.message
        });
    }
});


// ✅ GET SPECIFIC PAYMENT (Admin or user's own payment)
router.get("/:Payment_ID", authenticateUser, async (req, res) => {
    try {
        const { Payment_ID } = req.params;
        const pool = await poolPromise;

        // First get the payment with booking info to verify ownership
        const paymentResult = await pool.request()
            .input("Payment_ID", sql.Int, Payment_ID)
            .query(`
                SELECT p.*, b.User_ID 
                FROM Payments p
                JOIN Bookings b ON p.Booking_ID = b.Booking_ID
                WHERE p.Payment_ID = @Payment_ID
            `);

        if (paymentResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        const payment = paymentResult.recordset[0];
        
        // Authorization check
        if (req.user.role !== "admin" && payment.User_ID !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized - You can only view your own payments"
            });
        }

        // Get full payment details
        const detailedResult = await pool.request()
            .input("Payment_ID", sql.Int, Payment_ID)
            .query(`
                SELECT 
                    p.*,
                    b.Booking_Time,
                    b.Booking_Status,
                    u.User_Name,
                    u.User_Email,
                    c.Cinema_Name,
                    m.Movie_Name,
                    st.Show_Date,
                    st.Show_Time,
                    (
                        SELECT STRING_AGG(CONCAT(sb.Seat_Number, sb.Aisle), ', ')
                        FROM Seats_Booking sb
                        WHERE sb.Booking_ID = b.Booking_ID
                    ) AS Seats,
                    (
                        SELECT SUM(sb.Total_Price)
                        FROM Seats_Booking sb
                        WHERE sb.Booking_ID = b.Booking_ID
                    ) AS Total_Amount
                FROM Payments p
                JOIN Bookings b ON p.Booking_ID = b.Booking_ID
                JOIN Users u ON b.User_ID = u.User_ID
                JOIN Cinema c ON b.Cinema_ID = c.Cinema_ID
                JOIN Show_Timings st ON b.Show_ID = st.Show_ID
                JOIN Movies m ON st.Movie_ID = m.Movie_ID
                WHERE p.Payment_ID = @Payment_ID
            `);

        res.status(200).json({
            success: true,
            payment: detailedResult.recordset[0]
        });
    } catch (error) {
        console.error("Error fetching payment:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch payment",
            error: error.message
        });
    }
});

// ✅ ADD A PAYMENT (User only - for their own bookings)
router.post("/", authenticateUser, authorizeRole("user"), async (req, res) => {
    try {
        const { Booking_ID, Payment_Method } = req.body;
        const User_ID = req.user.id;

        if (!Booking_ID || !Payment_Method) {
            return res.status(400).json({
                success: false,
                message: "Booking ID and Payment Method are required"
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
                message: "Unauthorized - You can only add payments to your own bookings"
            });
        }

        if (booking.Booking_Status === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: "Cannot add payment to a cancelled booking"
            });
        }

        // Calculate total amount from seats
        const amountResult = await pool.request()
            .input("Booking_ID", sql.Int, Booking_ID)
            .query(`
                SELECT SUM(Total_Price) AS Total
                FROM Seats_Booking
                WHERE Booking_ID = @Booking_ID
            `);

        const Amount = amountResult.recordset[0].Total;

        if (!Amount || Amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "No seats found for this booking or invalid amount"
            });
        }

        // Start transaction
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Create payment
            const paymentResult = await new sql.Request(transaction)
                .input("Booking_ID", sql.Int, Booking_ID)
                .input("Amount", sql.Int, Amount)
                .input("Payment_Method", sql.VarChar, Payment_Method)
                .input("Payment_Status", sql.VarChar, "Completed")
                .query(`
                    INSERT INTO Payments 
                    (Booking_ID, Amount, Payment_Method, Payment_Status)
                    OUTPUT INSERTED.Payment_ID
                    VALUES (@Booking_ID, @Amount, @Payment_Method, @Payment_Status)
                `);

            // Update booking status
            await new sql.Request(transaction)
                .input("Booking_ID", sql.Int, Booking_ID)
                .input("Booking_Status", sql.VarChar, "Complete")
                .query(`
                    UPDATE Bookings 
                    SET Booking_Status = @Booking_Status
                    WHERE Booking_ID = @Booking_ID
                `);

            // Commit transaction
            await transaction.commit();

            res.status(201).json({
                success: true,
                message: "Payment created successfully",
                paymentId: paymentResult.recordset[0].Payment_ID,
                amount: Amount
            });

        } catch (error) {
            // Rollback on error
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error("Error creating payment:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create payment",
            error: error.message
        });
    }
});

// ✅ UPDATE PAYMENT (User only - for their own bookings)
router.put("/:Payment_ID", authenticateUser, authorizeRole("user"), async (req, res) => {
    try {
        const { Payment_ID } = req.params;
        const { Payment_Method, Payment_Status } = req.body;
        const User_ID = req.user.id;

        if (!Payment_Method || !Payment_Status) {
            return res.status(400).json({
                success: false,
                message: "Payment Method and Status are required"
            });
        }

        const pool = await poolPromise;

        // Verify payment belongs to the user
        const paymentCheck = await pool.request()
            .input("Payment_ID", sql.Int, Payment_ID)
            .query(`
                SELECT p.*, b.User_ID 
                FROM Payments p
                JOIN Bookings b ON p.Booking_ID = b.Booking_ID
                WHERE p.Payment_ID = @Payment_ID
            `);

        if (paymentCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        const payment = paymentCheck.recordset[0];
        
        if (payment.User_ID !== User_ID) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized - You can only update your own payments"
            });
        }

        // Validate payment status
        if (!['Pending', 'Completed', 'Failed', 'Refunded'].includes(Payment_Status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Payment Status"
            });
        }

        const result = await pool.request()
            .input("Payment_ID", sql.Int, Payment_ID)
            .input("Payment_Method", sql.VarChar, Payment_Method)
            .input("Payment_Status", sql.VarChar, Payment_Status)
            .query(`
                UPDATE Payments 
                SET Payment_Method = @Payment_Method,
                    Payment_Status = @Payment_Status
                WHERE Payment_ID = @Payment_ID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Payment updated successfully"
        });
    } catch (error) {
        console.error("Error updating payment:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update payment",
            error: error.message
        });
    }
});

// ✅ DELETE PAYMENT (User only - for their own bookings)
router.delete("/:Payment_ID", authenticateUser, authorizeRole("user"), async (req, res) => {
    try {
        const { Payment_ID } = req.params;
        const User_ID = req.user.id;
        const pool = await poolPromise;

        // Verify payment belongs to the user
        const paymentCheck = await pool.request()
            .input("Payment_ID", sql.Int, Payment_ID)
            .query(`
                SELECT p.*, b.User_ID, b.Booking_Status 
                FROM Payments p
                JOIN Bookings b ON p.Booking_ID = b.Booking_ID
                WHERE p.Payment_ID = @Payment_ID
            `);

        if (paymentCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        const payment = paymentCheck.recordset[0];
        
        if (payment.User_ID !== User_ID) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized - You can only delete your own payments"
            });
        }

        if (payment.Payment_Status === 'Completed' && payment.Booking_Status !== 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: "Cannot delete completed payment for an active booking"
            });
        }

        // Start transaction
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Delete payment
            const deleteResult = await new sql.Request(transaction)
                .input("Payment_ID", sql.Int, Payment_ID)
                .query(`
                    DELETE FROM Payments 
                    WHERE Payment_ID = @Payment_ID
                `);

            if (deleteResult.rowsAffected[0] === 0) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: "Payment not found"
                });
            }

            // If this was the only payment, revert booking status
            const paymentsCount = await new sql.Request(transaction)
                .input("Booking_ID", sql.Int, payment.Booking_ID)
                .query(`
                    SELECT COUNT(*) AS Count
                    FROM Payments
                    WHERE Booking_ID = @Booking_ID
                `);

            if (paymentsCount.recordset[0].Count === 0) {
                await new sql.Request(transaction)
                    .input("Booking_ID", sql.Int, payment.Booking_ID)
                    .input("Booking_Status", sql.VarChar, "Pending")
                    .query(`
                        UPDATE Bookings 
                        SET Booking_Status = @Booking_Status
                        WHERE Booking_ID = @Booking_ID
                    `);
            }

            // Commit transaction
            await transaction.commit();

            res.status(200).json({
                success: true,
                message: "Payment deleted successfully"
            });

        } catch (error) {
            // Rollback on error
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error("Error deleting payment:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete payment",
            error: error.message
        });
    }
});

module.exports = router;
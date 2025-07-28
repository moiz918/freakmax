const express = require("express");
const { sql, poolPromise } = require("./db");
const { authenticateUser, authorizeRole } = require("./authMidware");

const router = express.Router();

// ✅ GET ALL CUSTOMER DISCOUNTS (Admin only)
router.get("/", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT cd.*, 
                   u.User_Name,
                   u.User_Email,
                   u.User_Number
            FROM Customer_Discounts cd
            JOIN Users u ON cd.User_ID = u.User_ID
            ORDER BY cd.Discount_ID DESC
        `);

        res.status(200).json({
            success: true,
            customerDiscounts: result.recordset
        });
    } catch (error) {
        console.error("Error fetching customer discounts:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching customer discounts",
            error: error.message
        });
    }
});

router.get("/:Discount_ID/:User_ID", authenticateUser, async (req, res) => {
    try {
        const { Discount_ID, User_ID } = req.params;
        const pool = await poolPromise;

        // Debug: Verify inputs
        console.log("Params:", { Discount_ID, User_ID });

        // Get discount with explicit User_ID selection
        const discountResult = await pool.request()
            .input("Discount_ID", sql.Int, Discount_ID)
            .input("User_ID", sql.Int, User_ID)
            .query(`
                SELECT cd.*, cd.User_ID AS DiscountUserID
                FROM Customer_Discounts cd
                WHERE cd.Discount_ID = @Discount_ID 
                AND cd.User_ID = @User_ID
            `);

        if (discountResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer discount not found"
            });
        }

        const discount = discountResult.recordset[0];
        
        // Debug: Show comparison values
        console.log("Auth Check Values:", {
            tokenUser: req.user.id,
            discountUser: discount.DiscountUserID,
            role: req.user.role
        });

        // Authorization check (updated)
        if (req.user.role !== "admin" && discount.DiscountUserID !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized - You can only view your own discounts"
            });
        }

        // Proceed with detailed query...
        const detailedResult = await pool.request()
            .input("Discount_ID", sql.Int, Discount_ID)
            .input("User_ID", sql.Int, User_ID)
            .query(`
                SELECT 
                    cd.*,
                    u.User_Name,
                    u.User_Email,
                    u.User_Number
                FROM Customer_Discounts cd
                JOIN Users u ON cd.User_ID = u.User_ID
                WHERE cd.Discount_ID = @Discount_ID 
                AND cd.User_ID = @User_ID
            `);

        res.status(200).json({
            success: true,
            customerDiscount: detailedResult.recordset[0]
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});


// ✅ GET MY DISCOUNTS (Current user's discounts only)
router.get("/my-discounts", authenticateUser, async (req, res) => {
    try {
        const pool = await poolPromise;
        const User_ID = req.user.id;

        // First check if user exists in Customer_Discounts
        const userCheck = await pool.request()
            .input("User_ID", sql.Int, User_ID)
            .query(`SELECT 1 FROM Customer_Discounts WHERE User_ID = @User_ID`);

        if (userCheck.recordset.length === 0) {
            return res.status(200).json({
                success: true,
                myDiscounts: []
            });
        }

        // Simplified query first to identify where it fails
        const simpleResult = await pool.request()
            .input("User_ID", sql.Int, User_ID)
            .query(`
                SELECT 
                    cd.Discount_ID,
                    cd.Points,
                    u.User_Name
                FROM Customer_Discounts cd
                JOIN Users u ON cd.User_ID = u.User_ID
                WHERE cd.User_ID = @User_ID
            `);

        // If simple query works, try the full query
        const result = await pool.request()
            .input("User_ID", sql.Int, User_ID)
            .query(`
                SELECT 
                    cd.Discount_ID,
                    cd.Points,
                    u.User_Name,
                    u.User_Email,
                    u.Num_Bookings,
                    ISNULL((
                        SELECT COUNT(*) 
                        FROM Bookings b 
                        WHERE b.User_ID = cd.User_ID
                        AND b.Booking_Status = 'Complete'
                    ), 0) AS CompletedBookings,
                    ISNULL((
                        SELECT SUM(p.Amount)
                        FROM Payments p
                        JOIN Bookings b ON p.Booking_ID = b.Booking_ID
                        WHERE b.User_ID = cd.User_ID
                        AND p.Payment_Status = 'Completed'
                    ), 0) AS TotalSpent
                FROM Customer_Discounts cd
                JOIN Users u ON cd.User_ID = u.User_ID
                WHERE cd.User_ID = @User_ID
            `);

        res.status(200).json({
            success: true,
            myDiscounts: result.recordset
        });

    } catch (error) {
        console.error("Error fetching user discounts:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch your discounts",
            error: error.message,
            stack: error.stack // Include stack trace for debugging
        });
    }
});

// ✅ ADD A CUSTOMER DISCOUNT (Admin only)
router.post("/", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { User_ID, Points } = req.body;

        if (!User_ID || Points === undefined || Points < 0) {
            return res.status(400).json({
                success: false,
                message: "Valid User ID and Points are required"
            });
        }

        const pool = await poolPromise;

        // Verify user exists
        const userCheck = await pool.request()
            .input("User_ID", sql.Int, User_ID)
            .query("SELECT User_ID FROM Users WHERE User_ID = @User_ID");

        if (userCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if discount already exists for user
        const discountCheck = await pool.request()
            .input("User_ID", sql.Int, User_ID)
            .query("SELECT Discount_ID FROM Customer_Discounts WHERE User_ID = @User_ID");

        if (discountCheck.recordset.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Discount already exists for this user"
            });
        }

        const result = await pool.request()
            .input("User_ID", sql.Int, User_ID)
            .input("Points", sql.Int, Points)
            .query(`
                INSERT INTO Customer_Discounts 
                (User_ID, Points)
                OUTPUT INSERTED.Discount_ID
                VALUES (@User_ID, @Points)
            `);

        res.status(201).json({
            success: true,
            message: "Customer discount added successfully",
            discountId: result.recordset[0].Discount_ID
        });
    } catch (error) {
        console.error("Error adding customer discount:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add customer discount",
            error: error.message
        });
    }
});

// ✅ UPDATE CUSTOMER DISCOUNT (Admin only)
router.put("/:Discount_ID/:User_ID", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { Discount_ID, User_ID } = req.params;
        const { Points } = req.body;

        if (Points === undefined || Points < 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Points value is required"
            });
        }

        const pool = await poolPromise;

        const result = await pool.request()
            .input("Discount_ID", sql.Int, Discount_ID)
            .input("User_ID", sql.Int, User_ID)
            .input("Points", sql.Int, Points)
            .query(`
                UPDATE Customer_Discounts 
                SET Points = @Points
                WHERE Discount_ID = @Discount_ID 
                AND User_ID = @User_ID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer discount not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Customer discount updated successfully"
        });
    } catch (error) {
        console.error("Error updating customer discount:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update customer discount",
            error: error.message
        });
    }
});

// ✅ DELETE CUSTOMER DISCOUNT (Admin only)
router.delete("/:Discount_ID/:User_ID", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { Discount_ID, User_ID } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input("Discount_ID", sql.Int, Discount_ID)
            .input("User_ID", sql.Int, User_ID)
            .query(`
                DELETE FROM Customer_Discounts 
                WHERE Discount_ID = @Discount_ID 
                AND User_ID = @User_ID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer discount not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Customer discount deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting customer discount:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete customer discount",
            error: error.message
        });
    }
});

module.exports = router;
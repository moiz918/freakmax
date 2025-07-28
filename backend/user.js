const express = require("express");
const { sql, poolPromise } = require("./db");
const { authenticateUser, authorizeRole } = require("./authMidware");
const bcrypt = require("bcrypt");

const router = express.Router();


// ✅ GET CURRENT USER DETAILS
router.get("/me", authenticateUser, async (req, res) => {
    try {
        const pool = await poolPromise;
        const userId = req.user.id; // Changed from userId to id
        
        const result = await pool.request()
            .input('userId', userId)
            .query(`
                SELECT User_ID, User_Name, User_Email, User_Number, Num_Bookings 
                FROM Users
                WHERE User_ID = @userId
            `);
            
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user: result.recordset[0]
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});

// ✅ GET ALL USERS (Admin Only)
router.get("/", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT User_ID, User_Name, User_Email, User_Number, Num_Bookings 
            FROM Users
        `);

        res.status(200).json({
            success: true,
            users: result.recordset
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});

// ✅ GET USER BY ID/NAME (Admin Only)
router.get("/:identifier", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { identifier } = req.params;
        const pool = await poolPromise;
        let result;

        if (!isNaN(identifier)) {
            result = await pool.request()
                .input("User_ID", sql.Int, identifier)
                .query(`
                    SELECT User_ID, User_Name, User_Email, User_Number, Num_Bookings 
                    FROM Users WHERE User_ID = @User_ID
                `);
        } else {
            result = await pool.request()
                .input("User_Name", sql.NVarChar, identifier)
                .query(`
                    SELECT User_ID, User_Name, User_Email, User_Number, Num_Bookings 
                    FROM Users WHERE User_Name = @User_Name
                `);
        }

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            user: result.recordset[0]
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});

// PUT /api/users/reset-password
router.put('/reset-password', async (req, res) => {
    const { User_Name, User_Email, User_Number, newPassword } = req.body;

    try {
        // Validate input
        if (!User_Name || !User_Email || !User_Number || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Validate email format
        if (!User_Email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Validate phone number format (XXXX-XXXXXXX)
        if (!User_Number.match(/^\d{4}-\d{7}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Phone number must be in XXXX-XXXXXXX format'
            });
        }

        // Validate password strength
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        const pool = await poolPromise;
        const request = pool.request();

        // Check if user exists with matching credentials
        const userCheckQuery = `
            SELECT User_ID FROM Users 
            WHERE User_Name = @User_Name 
            AND User_Email = @User_Email 
            AND User_Number = @User_Number
        `;

        request.input('User_Name', sql.VarChar, User_Name);
        request.input('User_Email', sql.VarChar, User_Email);
        request.input('User_Number', sql.VarChar, User_Number);

        const userResult = await request.query(userCheckQuery);

        if (userResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No user found with matching credentials'
            });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        const updateQuery = `
            UPDATE Users 
            SET User_Password = @HashedPassword 
            WHERE User_ID = @User_ID
        `;

        request.input('HashedPassword', sql.VarChar, hashedPassword);
        request.input('User_ID', sql.Int, userResult.recordset[0].User_ID);

        await request.query(updateQuery);

        return res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});


// ✅ UPDATE OWN PROFILE (PUT /me)
router.put("/me", authenticateUser, async (req, res) => {
    try {
        const loggedInUserId = req.user.id;
        const {
            updatedName,
            updatedEmail,
            updatedPassword,
            updatedPhone
        } = req.body;

        // Basic input validation
        if (!updatedName || !updatedEmail || !updatedPhone) {
            return res.status(400).json({
                success: false,
                message: "Name, Email, and Phone Number are required"
            });
        }

        const pool = await poolPromise;
        const updateRequest = pool.request();

        updateRequest.input("User_ID", sql.Int, loggedInUserId);
        updateRequest.input("Updated_Name", sql.NVarChar, updatedName);
        updateRequest.input("Updated_Email", sql.NVarChar, updatedEmail);
        updateRequest.input("Updated_Phone", sql.NVarChar, updatedPhone);

        let passwordClause = "";

        if (updatedPassword) {
            const encryptedPassword = await bcrypt.hash(updatedPassword, 10);
            updateRequest.input("Updated_Password", sql.NVarChar, encryptedPassword);
            passwordClause = ", User_Password = @Updated_Password";
        }

        const updateQuery = `
            UPDATE Users SET
                User_Name = @Updated_Name,
                User_Email = @Updated_Email,
                User_Number = @Updated_Phone
                ${passwordClause}
            WHERE User_ID = @User_ID
        `;

        const result = await updateRequest.query(updateQuery);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Your profile has been updated"
        });
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({
            success: false,
            message: "Profile update failed",
            error: err.message
        });
    }
});


// ✅ DELETE USER (User can delete self, Admin can delete any)
router.delete("/:id", authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const pool = await poolPromise;

        // Convert id to number and validate
        const userId = parseInt(id);
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        // Check permissions
        if (currentUser.role !== "admin" && userId !== currentUser.id) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own account"
            });
        }

        const result = await pool.request()
            .input("User_ID", sql.Int, userId)
            .query("DELETE FROM Users WHERE User_ID = @User_ID");

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "User deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({
            success: false,
            message: "Deletion failed",
            error: error.message
        });
    }
});

module.exports = router;
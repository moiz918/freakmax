const express = require("express");
const { sql, poolPromise } = require("./db");
const { authenticateUser, authorizeRole } = require("./authMidware");
const bcrypt = require("bcrypt");

const router = express.Router();




// ✅ GET CURRENT ADMIN PROFILE
router.get("/me", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("Admin_ID", sql.Int, req.user.id)
            .query("SELECT Admin_ID, Username FROM Admins WHERE Admin_ID = @Admin_ID");

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Admin not found" 
            });
        }

        res.status(200).json({
            success: true,
            admin: result.recordset[0]
        });
    } catch (error) {
        console.error("Error fetching admin profile:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error",
            error: error.message
        });
    }
});




// ✅ GET ALL ADMINS (Admin Only)
router.get("/", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT Admin_ID, Username, Created_At 
            FROM Admins
        `);

        res.status(200).json({
            success: true,
            admins: result.recordset
        });
    } catch (error) {
        console.error("Error fetching admins:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});

// ✅ GET ADMIN BY ID/USERNAME (Admin Only)
router.get("/:identifier", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { identifier } = req.params;
        const pool = await poolPromise;
        let result;

        if (!isNaN(identifier)) {
            result = await pool.request()
                .input("Admin_ID", sql.Int, identifier)
                .query(`
                    SELECT Admin_ID, Username, Created_At 
                    FROM Admins WHERE Admin_ID = @Admin_ID
                `);
        } else {
            result = await pool.request()
                .input("Username", sql.NVarChar, identifier)
                .query(`
                    SELECT Admin_ID, Username, Created_At 
                    FROM Admins WHERE Username = @Username
                `);
        }

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        res.status(200).json({
            success: true,
            admin: result.recordset[0]
        });
    } catch (error) {
        console.error("Error fetching admin:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});




// ✅ ADD ADMIN (Admin Only - For creating new admin accounts)
router.post("/", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { Username, Password } = req.body;

        // Validate input
        if (!Username || !Password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        const pool = await poolPromise;

        // Check if username already exists
        const usernameCheck = await pool.request()
            .input("Username", sql.NVarChar, Username)
            .query("SELECT Admin_ID FROM Admins WHERE Username = @Username");

        if (usernameCheck.recordset.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Username already exists"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(Password, 10);

        // Create admin
        await pool.request()
            .input("Username", sql.NVarChar, Username)
            .input("Password", sql.NVarChar, hashedPassword)
            .query(`
                INSERT INTO Admins 
                (Username, Password)
                VALUES 
                (@Username, @Password)
            `);

        res.status(201).json({
            success: true,
            message: "Admin account created successfully"
        });
    } catch (error) {
        console.error("Error creating admin:", error);
        res.status(500).json({
            success: false,
            message: "Account creation failed",
            error: error.message
        });
    }
});


// PUT /api/admins/reset-password
router.put('/reset-password', async (req, res) => {
    const { Username, AdminKey, newPassword } = req.body;

    try {
        // Validate input
        if (!Username || !AdminKey || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Username, admin key and new password are required'
            });
        }

        // Verify admin key (use environment variable in production)
        const validAdminKey = process.env.ADMIN_KEY || 'krlaangy';
        if (AdminKey !== validAdminKey) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin key'
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

        // Check if admin exists
        const adminCheckQuery = `
            SELECT Admin_ID FROM Admins 
            WHERE Username = @Username
        `;

        request.input('Username', sql.NVarChar, Username);
        const adminResult = await request.query(adminCheckQuery);

        if (adminResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        const updateQuery = `
            UPDATE Admins 
            SET Password = @HashedPassword 
            WHERE Admin_ID = @Admin_ID
        `;

        request.input('HashedPassword', sql.NVarChar, hashedPassword);
        request.input('Admin_ID', sql.Int, adminResult.recordset[0].Admin_ID);

        await request.query(updateQuery);

        return res.status(200).json({
            success: true,
            message: 'Admin password reset successfully'
        });

    } catch (error) {
        console.error('Admin password reset error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});



// ✅ UPDATE ADMIN (Admin can only update self)
router.put("/:id", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const currentAdminId = req.user.id;
        const { Username, Password } = req.body;

        // Convert id to number and validate
        const adminId = parseInt(id);
        if (isNaN(adminId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid admin ID"
            });
        }

        // Validate that admin is updating their own profile
        if (adminId !== currentAdminId) {
            return res.status(403).json({
                success: false,
                message: "You can only update your own profile"
            });
        }

        // Validate input
        if (!Username) {
            return res.status(400).json({
                success: false,
                message: "Username is required"
            });
        }

        const pool = await poolPromise;
        const request = pool.request();

        // Add required parameters
        request.input("Admin_ID", sql.Int, adminId);
        request.input("Username", sql.NVarChar, Username);

        // Handle password update if provided
        let passwordUpdate = "";
        if (Password) {
            const hashedPassword = await bcrypt.hash(Password, 10);
            request.input("Password", sql.NVarChar, hashedPassword);
            passwordUpdate = ", Password = @Password";
        }

        // Check if new username already exists (excluding current admin)
        const usernameCheck = await pool.request()
            .input("Username", sql.NVarChar, Username)
            .input("Admin_ID", sql.Int, adminId)
            .query("SELECT Admin_ID FROM Admins WHERE Username = @Username AND Admin_ID != @Admin_ID");

        if (usernameCheck.recordset.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Username already taken by another admin"
            });
        }

        const query = `
            UPDATE Admins SET
            Username = @Username
            ${passwordUpdate}
            WHERE Admin_ID = @Admin_ID
        `;

        const result = await request.query(query);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Admin profile updated successfully"
        });
    } catch (error) {
        console.error("Error updating admin:", error);
        res.status(500).json({
            success: false,
            message: "Update failed",
            error: error.message
        });
    }
});





// ✅ DELETE ADMIN (Admin can only delete self)
router.delete("/:id", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const currentAdminId = req.user.id;
        const pool = await poolPromise;

        // Convert id to number and validate
        const adminId = parseInt(id);
        if (isNaN(adminId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid admin ID"
            });
        }

        // Validate that admin is deleting their own account
        if (adminId !== currentAdminId) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own account"
            });
        }

        const result = await pool.request()
            .input("Admin_ID", sql.Int, adminId)
            .query("DELETE FROM Admins WHERE Admin_ID = @Admin_ID");

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Admin account deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting admin:", error);
        res.status(500).json({
            success: false,
            message: "Deletion failed",
            error: error.message
        });
    }
});

module.exports = router;
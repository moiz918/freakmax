const express = require("express");
const { sql, poolPromise } = require("./db");
const { authenticateUser, authorizeRole } = require("./authMidware");

const router = express.Router();

// ✅ GET ALL COMPLAINTS (Admin sees all, user sees only their own)
router.get("/", authenticateUser, async (req, res) => {
    try {
        const pool = await poolPromise;
        let query = "";
        let params = {};

        if (req.user.role === "admin") {
            query = `
                SELECT 
                    c.Complaint_ID,
                    c.User_ID,
                    u.User_Name,
                    u.User_Email,
                    c.Complaint_Description,
                    c.Complaint_Status,
                    CONVERT(varchar, c.Created_Time, 108) AS Created_Time
                FROM Complaints c
                LEFT JOIN Users u ON c.User_ID = u.User_ID
                ORDER BY c.Complaint_ID DESC
            `;
        } else {
            query = `
                SELECT 
                    c.Complaint_ID,
                    c.User_ID,
                    u.User_Name,
                    u.User_Email,
                    c.Complaint_Description,
                    c.Complaint_Status,
                    CONVERT(varchar, c.Created_Time, 108) AS Created_Time
                FROM Complaints c
                LEFT JOIN Users u ON c.User_ID = u.User_ID
                WHERE c.User_ID = @id
                ORDER BY c.Complaint_ID DESC
            `;
            params = { id: req.user.id };  // Changed from User_ID to id
        }

        const request = pool.request();
        Object.keys(params).forEach(key => {
            request.input(key, sql.Int, params[key]);
        });

        const result = await request.query(query);

        res.status(200).json({
            success: true,
            complaints: result.recordset
        });
    } catch (error) {
        console.error("Error fetching complaints:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching complaints",
            error: error.message
        });
    }
});

// ✅ GET SPECIFIC COMPLAINT (Admin or user's own complaint)
router.get("/:Complaint_ID", authenticateUser, async (req, res) => {
    try {
        const { Complaint_ID } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input("Complaint_ID", sql.Int, Complaint_ID)
            .query(`
                SELECT 
                    c.*,
                    u.User_Name,
                    u.User_Email
                FROM Complaints c
                LEFT JOIN Users u ON c.User_ID = u.User_ID
                WHERE c.Complaint_ID = @Complaint_ID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found"
            });
        }

        const complaint = result.recordset[0];
        
        // Authorization check
        if (req.user.role !== "admin" && (!complaint.User_ID || complaint.User_ID !== req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized - You can only view your own complaints"
            });
        }

        res.status(200).json({
            success: true,
            complaint: {
                ...complaint,
                Created_Time: complaint.Created_Time.toString().substring(0, 8) // Format time as HH:MM:SS
            }
        });
    } catch (error) {
        console.error("Error fetching complaint:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch complaint",
            error: error.message
        });
    }
});

// ✅ ADD A COMPLAINT (Authenticated users)
router.post("/", authenticateUser, async (req, res) => {
    try {
        const { Complaint_Description } = req.body;

        if (!Complaint_Description) {
            return res.status(400).json({ 
                success: false, 
                message: "Complaint description is required" 
            });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input("User_ID", sql.Int, req.user.id)
            .input("Complaint_Description", sql.NVarChar, Complaint_Description)
            .input("Complaint_Status", sql.VarChar, 'Open')
            .query(`
                INSERT INTO Complaints (User_ID, Complaint_Description, Complaint_Status)
                OUTPUT INSERTED.Complaint_ID
                VALUES (@User_ID, @Complaint_Description, @Complaint_Status)
            `);

        res.status(201).json({ 
            success: true, 
            message: "Complaint added successfully",
            complaintId: result.recordset[0].Complaint_ID
        });
    } catch (error) {
        console.error("Error adding complaint:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add complaint",
            error: error.message
        });
    }
});

router.put("/:Complaint_ID", authenticateUser, async (req, res) => {
    try {
        // 1. Validate and parse Complaint_ID
        const complaintId = parseInt(req.params.Complaint_ID);
        if (isNaN(complaintId)) {
            return res.status(400).json({
                success: false,
                message: "Complaint ID must be a valid number"
            });
        }

        // 2. Validate request body
        const { Complaint_Description, Complaint_Status } = req.body;
        if (!Complaint_Description && !Complaint_Status) {
            return res.status(400).json({
                success: false,
                message: "At least one field (description or status) must be provided"
            });
        }

        if (Complaint_Status && !['Open', 'Closed'].includes(Complaint_Status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Must be either 'Open' or 'Closed'"
            });
        }

        const pool = await poolPromise;

        // 3. Check complaint exists and verify ownership
        const complaintCheck = await pool.request()
            .input("Complaint_ID", sql.Int, complaintId)
            .query(`
                SELECT User_ID FROM Complaints 
                WHERE Complaint_ID = @Complaint_ID
            `);

        if (complaintCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found"
            });
        }

        // 4. Authorization check
        const complaint = complaintCheck.recordset[0];
        if (req.user.role !== "admin" && complaint.User_ID !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized - You can only update your own complaints"
            });
        }

        // 5. Build dynamic update query
        const updates = [];
        const params = {
            Complaint_ID: { type: sql.Int, value: complaintId }
        };

        if (Complaint_Description) {
            updates.push("Complaint_Description = @Complaint_Description");
            params.Complaint_Description = { 
                type: sql.NVarChar, 
                value: Complaint_Description 
            };
        }

        if (Complaint_Status) {
            updates.push("Complaint_Status = @Complaint_Status");
            params.Complaint_Status = { 
                type: sql.VarChar, 
                value: Complaint_Status 
            };
        }

        // 6. Execute update
        const request = pool.request();
        Object.entries(params).forEach(([key, { type, value }]) => {
            request.input(key, type, value);
        });

        const result = await request.query(`
            UPDATE Complaints
            SET ${updates.join(", ")}
            WHERE Complaint_ID = @Complaint_ID
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(500).json({
                success: false,
                message: "No rows were updated"
            });
        }

        res.status(200).json({
            success: true,
            message: "Complaint updated successfully"
        });

    } catch (error) {
        console.error("Error updating complaint:", error);
        
        // Handle specific SQL errors
        if (error.code === 'EPARAM') {
            return res.status(400).json({
                success: false,
                message: "Invalid parameter format",
                details: "Please check your input values"
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to update complaint",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ✅ DELETE COMPLAINT (Admin or user's own complaint)
router.delete("/:Complaint_ID", authenticateUser, async (req, res) => {
    try {
        const { Complaint_ID } = req.params;
        const pool = await poolPromise;

        // First get the complaint to check ownership
        const complaintResult = await pool.request()
            .input("Complaint_ID", sql.Int, Complaint_ID)
            .query("SELECT User_ID FROM Complaints WHERE Complaint_ID = @Complaint_ID");

        if (complaintResult.recordset.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Complaint not found" 
            });
        }

        const complaint = complaintResult.recordset[0];
        
        // Authorization check
        if (req.user.role !== "admin" && (!complaint.User_ID || complaint.User_ID !== req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized - You can only delete your own complaints"
            });
        }

        // Delete the complaint
        const result = await pool.request()
            .input("Complaint_ID", sql.Int, Complaint_ID)
            .query("DELETE FROM Complaints WHERE Complaint_ID = @Complaint_ID");

        res.status(200).json({ 
            success: true, 
            message: "Complaint deleted successfully" 
        });
    } catch (error) {
        console.error("Error deleting complaint:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete complaint",
            error: error.message
        });
    }
});

module.exports = router;
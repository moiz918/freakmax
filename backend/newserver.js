//IMPORTS ALL ROUTES AND STARTS THE SQL SERVER

const express = require('express');
const jwt = require('jsonwebtoken');  // Import JWT
const cors=require('cors'); //Import cors
const bcrypt = require("bcrypt"); //Import Bcrypt
const bodyParser = require('body-parser'); //Import body-parser

const {sql,poolPromise} = require('./db.js'); //import connection from index.js

require("dotenv").config(); //for the environment file which contains secret key
const jwtSecret = process.env.JWT_SECRET || "your_jwt_secret";


const app = express();
app.use(bodyParser.json());
app.use(express.json());
app.use(cors());


const { authenticateUser, authorizeRole } = require("./authMidware"); //Import the Authorization from authMiddleware.js


const PORT = 5000;

const server=app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

async function hashExistingPasswords() {
    try {
      const pool = await poolPromise;
  
      // BCrypt regex pattern (starts with $2a$, $2b$, $2y$ followed by cost factor and hash)
      const bcryptRegex = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
  
      // Hashing user passwords
      const users = await pool.request().query("SELECT User_ID, User_Password FROM Users");
  
      for (let user of users.recordset) {
        if (user.User_Password && !bcryptRegex.test(user.User_Password)) {
          const hashedPassword = await bcrypt.hash(user.User_Password, 10);
          await pool
            .request()
            .input("User_ID", sql.Int, user.User_ID)
            .input("Hashed_Password", sql.VarChar, hashedPassword)
            .query("UPDATE Users SET User_Password = @Hashed_Password WHERE User_ID = @User_ID");
        }
      }
  
      console.log("User passwords updated successfully.");
  
      // Hashing admin passwords
      const admins = await pool.request().query("SELECT Admin_ID, Password FROM Admins");
  
      for (let admin of admins.recordset) {
        if (admin.Password && !bcryptRegex.test(admin.Password)) {
          const hashedPassword = await bcrypt.hash(admin.Password, 10);
          await pool
            .request()
            .input("Admin_ID", sql.Int, admin.Admin_ID)
            .input("Hashed_Password", sql.VarChar, hashedPassword)
            .query("UPDATE Admins SET Password = @Hashed_Password WHERE Admin_ID = @Admin_ID");
        }
      }
  
      console.log("Admin passwords updated successfully.");
    } catch (err) {
      console.error("Error hashing passwords:", err);
    }
}

hashExistingPasswords();





//Customer login

app.post("/user/login", async (req, res) => {
  const { User_Email, User_Password } = req.body;
  
  try {
      const pool = await poolPromise;
      const result = await pool
          .request()
          .input("User_Email", sql.NVarChar, User_Email)
          .query("SELECT * FROM Users WHERE User_Email = @User_Email");

      if (result.recordset.length === 0) {
          return res.status(401).json({ success: false, message: "Invalid email " });
      }

      const user = result.recordset[0];

      const isMatch = await bcrypt.compare(User_Password, user.User_Password);

      if (!isMatch) {
          return res.status(401).json({ success: false, message: "Incorrect password" });
      }

      // Generate JWT token 
      const token = jwt.sign({ id: user.User_ID, role: "user" }, jwtSecret, { expiresIn: "1h" });

      res.json({ 
          success: true, 
          token, 
          user: { id: user.User_ID, email: user.User_Email, role: "user" } 
      });
  } catch (error) {
      res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});


//Admin Login

app.post("/admin/login", async (req, res) => {
  const { Username, Password } = req.body;

  try {
      const pool = await poolPromise;
      const result = await pool
          .request()
          .input("Username", sql.NVarChar, Username)
          .query("SELECT * FROM Admins WHERE Username = @Username");

      if (result.recordset.length === 0) {
          return res.status(401).json({ success: false, message: "Invalid username " });
      }

      const admin = result.recordset[0];

      // Compares the hashed password 
      const isMatch = await bcrypt.compare(Password, admin.Password);

      if (!isMatch) {
          return res.status(401).json({ success: false, message: "Incorrect password" });
      }

      // Generate JWT token and return user details
      const token = jwt.sign({ id: admin.Admin_ID, role: "admin" }, jwtSecret, { expiresIn: "1h" });

      res.json({ 
          success: true, 
          token, 
          user: { id: admin.Admin_ID, username: admin.Username, role: "admin" } 
      });
  } catch (error) {
      res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});





// Admin-only route that returns "HELLO WORLD"
app.get("/admin/hello", authenticateUser, authorizeRole("admin"), (req, res) => {
  res.status(200).json({ success: true, message: "HELLO WORLD" });
});



// GET TOP 5 MOVIES (accessible to both admin and user)
app.get("/api/movies/top5",authenticateUser, authorizeRole("admin", "user"), // Changed from "customer" to "user"
    async (req, res) => {
      try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM Top5Movies");
  
        if (result.recordset.length === 0) {
          return res.status(404).json({ 
            success: false, 
            message: "No top movies found in the database" 
          });
        }
  
        res.status(200).json({
          success: true,
          data: result.recordset // Changed from "customerData" to "data" for consistency
        });
      } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({
          success: false,
          message: "Internal Server Error",
          error: error.message // Added error details for debugging
        });
      }
    }
  );

// GET  list of children-friendly movies (Access: Admin & User)
app.get( "/api/movies/children-friendly",authenticateUser, authorizeRole("admin", "user"),
    async (req, res) => {
      try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM ChildrenFriendlyMovies");
  
        if (result.recordset.length === 0) {
          return res.status(404).json({ 
            success: false, 
            message: "No children-friendly movies found" 
          });
        }
  
        res.status(200).json({
          success: true,
          data: result.recordset
        });
      } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({
          success: false,
          message: "Internal Server Error",
          error: error.message
        });
      }
    }
  );


  // GET /api/shows/active - Returns active show timings sorted by date/time (Access: Admin & User)
app.get("/api/shows/active", authenticateUser, authorizeRole("admin", "user"), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool
            .request()
            .query("SELECT * FROM ActiveShowTimings ORDER BY Show_Date, Show_Time");

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "No active shows found" });
        }

        res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
});


// GET /api/bookings/history - Returns all users' booking history (Admin Only)
app.get("/api/bookings/history", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool
            .request()
            .query("SELECT * FROM UserBookingHistory");

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "No booking history found" });
        }

        res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
});


// GET /api/users/frequent - Returns list of frequent users (Admin Only)
app.get("/api/users/frequent", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool
            .request()
            .query("SELECT * FROM FrequentUsers");

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "No frequent users found" });
        }

        res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
});

const userRoutes = require('./user');
const adminRoutes = require('./admin');
const movieRoutes = require('./movie');
const cinemaRoutes = require('./cinema');
const screenRoutes = require('./screen');
const seatRoutes = require('./seat');
const showTimingRoutes = require('./showtiming');
const bookingRoutes = require('./booking');
const seatBookingRoutes = require('./seatbooking');
const paymentRoutes = require('./payment');
const customerDiscountRoutes = require('./customer-discount');
const cancellationRoutes = require('./cancellation');
const complaintsRouter = require('./complaint');




app.use("/api/users", userRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/cinemas", cinemaRoutes);
app.use("/api/screens", screenRoutes);
app.use("/api/seats", seatRoutes);
app.use("/api/show-timings", showTimingRoutes);
app.use("/api/bookings", bookingRoutes);
app.use('/api/seats-booking', seatBookingRoutes);
app.use('/api/cancellations', cancellationRoutes);
app.use('/api/customer-discounts', customerDiscountRoutes);
app.use('/api/complaints', complaintsRouter);
app.use('/api/payments', paymentRoutes);












// SCREEN CATEGORIES CRUD OPERATIONS (Admin only)



// GET ALL SCREEN CATEGORIES
app.get("/api/screen-categories", authenticateUser, authorizeRole("admin"), async (req, res) => {
  try {
      const pool = await poolPromise;
      const result = await pool.request().query("SELECT * FROM Screen_Categories");
      
      res.status(200).json({
          success: true,
          categories: result.recordset
      });
  } catch (error) {
      console.error("Error fetching screen categories:", error);
      res.status(500).json({
          success: false,
          message: "Failed to fetch screen categories",
          error: error.message
      });
  }
});

// GET SPECIFIC SCREEN CATEGORY
app.get("/api/screen-categories/:category", authenticateUser, authorizeRole("admin"), async (req, res) => {
  try {
      const { category } = req.params;
      const pool = await poolPromise;

      const result = await pool.request()
          .input("category", sql.VarChar, category)
          .query("SELECT * FROM Screen_Categories WHERE Screen_Category = @category");

      if (result.recordset.length === 0) {
          return res.status(404).json({
              success: false,
              message: "Screen category not found"
          });
      }

      res.status(200).json({
          success: true,
          category: result.recordset[0]
      });
  } catch (error) {
      console.error("Error fetching screen category:", error);
      res.status(500).json({
          success: false,
          message: "Failed to fetch screen category",
          error: error.message
      });
  }
});

// ADD NEW SCREEN CATEGORY
app.post("/api/screen-categories", authenticateUser, authorizeRole("admin"), async (req, res) => {
  try {
      const { Screen_Category, Screen_Price } = req.body;

      if (!Screen_Category || !Screen_Price) {
          return res.status(400).json({
              success: false,
              message: "Both Screen_Category and Screen_Price are required"
          });
      }

      const pool = await poolPromise;
      await pool.request()
          .input("Screen_Category", sql.VarChar, Screen_Category)
          .input("Screen_Price", sql.Int, Screen_Price)
          .query("INSERT INTO Screen_Categories (Screen_Category, Screen_Price) VALUES (@Screen_Category, @Screen_Price)");

      res.status(201).json({
          success: true,
          message: "Screen category added successfully"
      });
  } catch (error) {
      console.error("Error adding screen category:", error);
      
      let errorMessage = "Failed to add screen category";
      if (error.number === 2627) { // SQL Server unique constraint violation
          errorMessage = "Screen category already exists";
      }

      res.status(500).json({
          success: false,
          message: errorMessage,
          error: error.message
      });
  }
});

// UPDATE SCREEN CATEGORY PRICE
app.put("/api/screen-categories/:category", authenticateUser, authorizeRole("admin"), async (req, res) => {
  try {
      const { category } = req.params;
      const { Screen_Price } = req.body;

      if (!Screen_Price) {
          return res.status(400).json({
              success: false,
              message: "Screen_Price is required"
          });
      }

      const pool = await poolPromise;
      const result = await pool.request()
          .input("category", sql.VarChar, category)
          .input("Screen_Price", sql.Int, Screen_Price)
          .query("UPDATE Screen_Categories SET Screen_Price = @Screen_Price WHERE Screen_Category = @category");

      if (result.rowsAffected[0] === 0) {
          return res.status(404).json({
              success: false,
              message: "Screen category not found"
          });
      }

      res.status(200).json({
          success: true,
          message: "Screen category price updated successfully"
      });
  } catch (error) {
      console.error("Error updating screen category:", error);
      res.status(500).json({
          success: false,
          message: "Failed to update screen category",
          error: error.message
      });
  }
});

// DELETE SCREEN CATEGORY
app.delete("/api/screen-categories/:category", authenticateUser, authorizeRole("admin"), async (req, res) => {
  try {
      const { category } = req.params;
      const pool = await poolPromise;

      const result = await pool.request()
          .input("category", sql.VarChar, category)
          .query("DELETE FROM Screen_Categories WHERE Screen_Category = @category");

      if (result.rowsAffected[0] === 0) {
          return res.status(404).json({
              success: false,
              message: "Screen category not found"
          });
      }

      res.status(200).json({
          success: true,
          message: "Screen category deleted successfully"
      });
  } catch (error) {
      console.error("Error deleting screen category:", error);
      
      let errorMessage = "Failed to delete screen category";
      if (error.number === 547) { // SQL Server foreign key constraint violation
          errorMessage = "Cannot delete screen category as it is being referenced by other tables";
      }

      res.status(500).json({
          success: false,
          message: errorMessage,
          error: error.message
      });
  }
});


// SEAT TYPES CRUD OPERATIONS (Admin only)



// GET ALL SEAT TYPES
app.get("/api/seat-types", authenticateUser, authorizeRole("admin"), async (req, res) => {
  try {
      const pool = await poolPromise;
      const result = await pool.request().query("SELECT * FROM Seat_Types");
      
      res.status(200).json({
          success: true,
          seatTypes: result.recordset
      });
  } catch (error) {
      console.error("Error fetching seat types:", error);
      res.status(500).json({
          success: false,
          message: "Failed to fetch seat types",
          error: error.message
      });
  }
});

// GET SPECIFIC SEAT TYPE
app.get("/api/seat-types/:type", authenticateUser, authorizeRole("admin"), async (req, res) => {
  try {
      const { type } = req.params;
      const pool = await poolPromise;

      const result = await pool.request()
          .input("type", sql.VarChar, type)
          .query("SELECT * FROM Seat_Types WHERE Seat_Type = @type");

      if (result.recordset.length === 0) {
          return res.status(404).json({
              success: false,
              message: "Seat type not found"
          });
      }

      res.status(200).json({
          success: true,
          seatType: result.recordset[0]
      });
  } catch (error) {
      console.error("Error fetching seat type:", error);
      res.status(500).json({
          success: false,
          message: "Failed to fetch seat type",
          error: error.message
      });
  }
});

// ADD NEW SEAT TYPE
app.post("/api/seat-types", authenticateUser, authorizeRole("admin"), async (req, res) => {
  try {
      const { Seat_Type, Seat_Price } = req.body;

      if (!Seat_Type || !Seat_Price) {
          return res.status(400).json({
              success: false,
              message: "Both Seat_Type and Seat_Price are required"
          });
      }

      const pool = await poolPromise;
      await pool.request()
          .input("Seat_Type", sql.VarChar, Seat_Type)
          .input("Seat_Price", sql.Int, Seat_Price)
          .query("INSERT INTO Seat_Types (Seat_Type, Seat_Price) VALUES (@Seat_Type, @Seat_Price)");

      res.status(201).json({
          success: true,
          message: "Seat type added successfully"
      });
  } catch (error) {
      console.error("Error adding seat type:", error);
      
      let errorMessage = "Failed to add seat type";
      if (error.number === 2627) { // SQL Server unique constraint violation
          errorMessage = "Seat type already exists";
      }

      res.status(500).json({
          success: false,
          message: errorMessage,
          error: error.message
      });
  }
});

// UPDATE SEAT TYPE PRICE
app.put("/api/seat-types/:type", authenticateUser, authorizeRole("admin"), async (req, res) => {
  try {
      const { type } = req.params;
      const { Seat_Price } = req.body;

      if (!Seat_Price) {
          return res.status(400).json({
              success: false,
              message: "Seat_Price is required"
          });
      }

      const pool = await poolPromise;
      const result = await pool.request()
          .input("type", sql.VarChar, type)
          .input("Seat_Price", sql.Int, Seat_Price)
          .query("UPDATE Seat_Types SET Seat_Price = @Seat_Price WHERE Seat_Type = @type");

      if (result.rowsAffected[0] === 0) {
          return res.status(404).json({
              success: false,
              message: "Seat type not found"
          });
      }

      res.status(200).json({
          success: true,
          message: "Seat type price updated successfully"
      });
  } catch (error) {
      console.error("Error updating seat type:", error);
      res.status(500).json({
          success: false,
          message: "Failed to update seat type",
          error: error.message
      });
  }
});

// DELETE SEAT TYPE
app.delete("/api/seat-types/:type", authenticateUser, authorizeRole("admin"), async (req, res) => {
  try {
      const { type } = req.params;
      const pool = await poolPromise;

      const result = await pool.request()
          .input("type", sql.VarChar, type)
          .query("DELETE FROM Seat_Types WHERE Seat_Type = @type");

      if (result.rowsAffected[0] === 0) {
          return res.status(404).json({
              success: false,
              message: "Seat type not found"
          });
      }

      res.status(200).json({
          success: true,
          message: "Seat type deleted successfully"
      });
  } catch (error) {
      console.error("Error deleting seat type:", error);
      
      let errorMessage = "Failed to delete seat type";
      if (error.number === 547) { // SQL Server foreign key constraint violation
          errorMessage = "Cannot delete seat type as it is being referenced by other tables";
      }

      res.status(500).json({
          success: false,
          message: errorMessage,
          error: error.message
      });
  }
});


//app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
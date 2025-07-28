const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { poolPromise } = require('./db');
const { authenticateUser, authorizeRole } = require('./authMidware');
const sql = require('mssql'); // Assuming mssql is being used for DB connections

const app = express();

app.use(express.json());


const cors = require('cors'); // Import cors
const corsOptions = {
  origin: 'http://localhost:3000', // Allow React frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Allow cookies and headers if needed
};

// Apply CORS middleware globally
app.use(cors(corsOptions));

// Handle OPTIONS (Preflight) requests globally
app.options('*', cors(corsOptions)); // This handles the preflight request for all routes



// Middleware to verify token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.sendStatus(403);
  
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
  }






// JWT Secret key
const jwtSecret = process.env.JWT_SECRET;


// Hash Existing User and Admin Passwords
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
  // Call the function to hash existing passwords
  hashExistingPasswords();

  
  







// GET TOP 5 MOVIES (accessible to both admin and user)
app.get("/api/movies/top5",authenticateUser, authorizeRole("admin", "user"), async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM Top5Movies");

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "No top movies found in the database" });
    }


    console.log("🎥 Top 5 Movies:", result.recordset);

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
});

// GET list of children-friendly movies (Access: Admin & User)
app.get("/api/movies/children-friendly",authenticateUser, authorizeRole("admin", "user"), async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM ChildrenFriendlyMovies");

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "No children-friendly movies found" });
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
});





// GET /api/shows/:showId/seats - Returns available seats for a show
app.get("/api/shows/:showId/seats", authenticateUser, authorizeRole("admin", "user"), async (req, res) => {
    try {
      const { showId } = req.params;
      const pool = await poolPromise;
      
      // First get screen info and show details
      const showInfo = await pool
        .request()
        .input('showId', sql.Int, showId)
        .query(`
          SELECT st.Screen_ID, scr.Total_Seats,
                 st.Show_Date, st.Show_Time, m.Movie_Name, c.Cinema_Name
          FROM Show_Timings st
          JOIN Screens scr ON st.Screen_ID = scr.Screen_ID
          JOIN Movies m ON st.Movie_ID = m.Movie_ID
          JOIN Cinema c ON st.Cinema_ID = c.Cinema_ID
          WHERE st.Show_ID = @showId
        `);
  
      if (showInfo.recordset.length === 0) {
        return res.status(404).json({ success: false, message: "Show not found" });
      }
  
      const screenInfo = showInfo.recordset[0];
      
      // Then get booked seats for this show
      const bookedSeats = await pool
        .request()
        .input('showId', sql.Int, showId)
        .query(`
          SELECT Seat_Number FROM Bookings b
          JOIN Seats_Booking s ON s.Booking_ID=b.Booking_ID
          WHERE Show_ID = @showId
        `);
  
      const bookedSeatNumbers = bookedSeats.recordset.map(seat => seat.Seat_Number);
      const totalSeats = screenInfo.Total_Seats;
      
      // Generate all seats and mark availability
      const seats = [];
      for (let i = 1; i <= totalSeats; i++) {
        seats.push({
          seatNumber: i,
          available: !bookedSeatNumbers.includes(i)
        });
      }
  
      res.status(200).json({
        success: true,
        screenInfo: {
          screenId: screenInfo.Screen_ID,
          screenNumber: screenInfo.Screen_Number,
          totalSeats: screenInfo.Total_Seats,
          movieName: screenInfo.Movie_Name,
          cinemaName: screenInfo.Cinema_Name,
          showTime: screenInfo.Show_Date
        },
        seats
      });
  
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal Server Error", 
        error: error.message 
      });
    }
  });


// Updated /api/shows/active endpoint
app.get("/api/shows/active", authenticateUser, authorizeRole("admin", "user"), async (req, res) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .query(`
          SELECT 
            st.Show_ID,
            c.Cinema_ID,
            c.Cinema_Name,
            m.Movie_Name,
            st.Show_Time,
            st.Show_Date,
            st.Screen_ID,
            m.Image_Link
          FROM 
            Show_Timings st
          JOIN 
            Movies m ON st.Movie_ID = m.Movie_ID
          JOIN 
            Cinema c ON st.Cinema_ID = c.Cinema_ID
          JOIN
            Screens scr ON st.Screen_ID = scr.Screen_ID
          WHERE 
            st.Show_Date >= CAST(GETDATE() AS DATE)
          ORDER BY 
            st.Show_Date, 
            st.Show_Time
        `);
  
      if (result.recordset.length === 0) {
        return res.status(404).json({ success: false, message: "No active shows found" });
      }
  
      res.status(200).json({ 
        success: true, 
        activeShows: result.recordset
      });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal Server Error", 
        error: error.message 
      });
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

//--------------------------------------------------------------------------------------------------

app.post("/user/signup", async (req, res) => {
    const { User_Name, User_Email, User_Password, User_Number } = req.body;
  
    console.log("Received signup request with data:", req.body); // Log incoming data
  
    try {
      const pool = await poolPromise;
      console.log("Database pool connected successfully"); // Verify DB connection
      
      // Check if user exists
      const checkUserQuery = 'SELECT * FROM Users WHERE User_Email = @User_Email';
      console.log("Executing query:", checkUserQuery);
      
      const result = await pool
        .request()
        .input('User_Email', sql.NVarChar, User_Email)
        .query(checkUserQuery);
      
      console.log("User check result:", result.recordset);
      
      if (result.recordset.length > 0) {
        console.log("User already exists with email:", User_Email);
        return res.status(400).json({ message: 'User already exists' });
      }
  
      console.log("Hashing password...");
      const hashedPassword = await bcrypt.hash(User_Password, 10);
      console.log("Password hashed successfully");
      
      const insertQuery = 'INSERT INTO Users (User_Name, User_Email, User_Password, User_Number) VALUES (@User_Name, @User_Email, @User_Password, @User_Number)';
      console.log("Executing insert query:", insertQuery);
      
      await pool
        .request()
        .input('User_Name', sql.NVarChar, User_Name)
        .input('User_Email', sql.NVarChar, User_Email)
        .input('User_Password', sql.NVarChar, hashedPassword)
        .input('User_Number', sql.NVarChar, User_Number)
        .query(insertQuery);
      
      console.log("User created successfully");
      res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
      console.error("Detailed error:", {
        message: error.message,
        stack: error.stack,
        code: error.code,
        number: error.number, // SQL Server specific
        state: error.state    // SQL Server specific
      });
      res.status(500).json({ 
        message: 'Server error',
        error: error.message,
        detailedError: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

// Admin Signup Route with Key Verification
app.post("/admin/signup", async (req, res) => {
    const { Username, Password, AdminKey } = req.body;
  
    try {
      // Verify admin key first
      if (AdminKey !== 'krlaangy') {
        return res.status(403).json({ message: 'Invalid admin key' });
      }
  
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('Username', sql.NVarChar, Username)
        .query('SELECT * FROM Admins WHERE Username = @Username');
      
      if (result.recordset.length > 0) {
        return res.status(400).json({ message: 'Admin already exists' });
      }
  
      const hashedPassword = await bcrypt.hash(Password, 10);
      
      await pool
        .request()
        .input('Username', sql.NVarChar, Username)
        .input('Password', sql.NVarChar, hashedPassword)
        .query('INSERT INTO Admins (Username, Password) VALUES (@Username, @Password)');
      
      res.status(201).json({ message: 'Admin created successfully' });
    } catch (error) {
      console.error("Error creating admin:", error);
      res.status(500).json({ 
        message: 'Server error', 
        error: error.message,
        detailedError: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

// User Login Route
app.post("/user/login", async (req, res) => {
  const { User_Email, User_Password } = req.body;

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('User_Email', sql.NVarChar, User_Email)
      .query('SELECT * FROM Users WHERE User_Email = @User_Email');

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(User_Password, user.User_Password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.User_ID, role: 'user' }, jwtSecret, { expiresIn: '1h' });
    res.status(200).json({ token, user: { id: user.User_ID, name: user.User_Name, email: user.User_Email, role: 'user' } });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin Login Route
app.post("/admin/login", async (req, res) => {
  const { Username, Password } = req.body;

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('Username', sql.NVarChar, Username)
      .query('SELECT * FROM Admins WHERE Username = @Username');

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }


    console.log(result.recordset);  // Add this line to check the result
        


    const admin = result.recordset[0];
    const isMatch = await bcrypt.compare(Password, admin.Password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: admin.Admin_ID, role: 'admin' }, jwtSecret, { expiresIn: '1h' });
    res.status(200).json({ token, user: { id: admin.Admin_ID, username: admin.Username, role: 'admin' } });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});




// GET ALL SCREEN CATEGORIES - Returns list of all screen categories (Admin Only)
app.get("/api/screen-categories", authenticateUser, authorizeRole("admin"), async (req, res) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .query("SELECT * FROM Screen_Categories");
  
      if (result.recordset.length === 0) {
        return res.status(404).json({ success: false, message: "No screen categories found" });
      }
  
      res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
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

//----------------------------------------------------------


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





// Starting the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

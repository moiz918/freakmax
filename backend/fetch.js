const sql = require("mssql");
require("dotenv").config();

// Database configuration - using your existing config structure
const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  port: parseInt(process.env.DB_PORT)
};

// Function to fetch data from all tables in FreakMax database
async function fetchFreakMaxData() {
  try {
    let pool = await sql.connect(config);
    console.log("✅ Connected to the FreakMax database");
    
    // List of all tables in FreakMax
    const tables = [
      "Users",
      "Cinema",
      "Movies", 
      "Screens",
      "Seats",
      "Show_Timings",
      "Bookings",
      "Seats_Booking",
      "Cancellations",
      "Payments", 
      "Customer_Discounts",
      "Complaints"
    ];
    
    // Fetch and display data from each table
    for (let table of tables) {
      let result = await pool.request().query(`SELECT * FROM ${table}`);
      console.log(`\n📄 Data from ${table}:`, result.recordset);
    }
    
    // Get Top 5 Popular Movies (by number of show timings)
    let topMovies = await pool.request().query(`
      SELECT m.Movie_Name, COUNT(st.Show_ID) AS Show_Count 
      FROM Movies m 
      JOIN Show_Timings st ON m.Movie_ID = st.Movie_ID 
      GROUP BY m.Movie_Name 
      ORDER BY Show_Count DESC 
      OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY`);
    console.log("\n🎬 Top 5 Popular Movies (by show count):", topMovies.recordset);
    
    // Get Top 5 Active Cinemas (by number of screens)
    let topCinemas = await pool.request().query(`
      SELECT c.Cinema_Name, COUNT(s.Screen_ID) AS Screen_Count 
      FROM Cinema c 
      JOIN Screens s ON c.Cinema_ID = s.Cinema_ID 
      GROUP BY c.Cinema_Name 
      ORDER BY Screen_Count DESC 
      OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY`);
    console.log("\n🎦 Top 5 Active Cinemas (by screen count):", topCinemas.recordset);
    
    // Get User Booking Statistics
    let userBookings = await pool.request().query(`
      SELECT u.User_Name, COUNT(b.Booking_ID) AS Booking_Count, 
             SUM(p.Amount) AS Total_Spent
      FROM Users u
      LEFT JOIN Bookings b ON u.User_ID = b.User_ID
      LEFT JOIN Payments p ON b.Booking_ID = p.Booking_ID
      GROUP BY u.User_Name
      ORDER BY Booking_Count DESC
      OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY`);
    console.log("\n👥 Top 10 Users by Booking Count:", userBookings.recordset);
    
    // Get Movie Genre Statistics
    let genreStats = await pool.request().query(`
      SELECT Genre, COUNT(Movie_ID) AS Movie_Count, 
             AVG(Rating) AS Average_Rating
      FROM Movies
      GROUP BY Genre
      ORDER BY Movie_Count DESC`);
    console.log("\n📊 Movie Genre Statistics:", genreStats.recordset);
    
    // Get Recent Bookings (Last 10)
    let recentBookings = await pool.request().query(`
      SELECT b.Booking_ID, u.User_Name, c.Cinema_Name, m.Movie_Name, 
             b.Booking_Time, b.Booking_Status
      FROM Bookings b
      JOIN Users u ON b.User_ID = u.User_ID
      JOIN Cinema c ON b.Cinema_ID = c.Cinema_ID
      JOIN Show_Timings st ON b.Show_ID = st.Show_ID
      JOIN Movies m ON st.Movie_ID = m.Movie_ID
      ORDER BY b.Booking_ID DESC
      OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY`);
    console.log("\n🎫 10 Most Recent Bookings:", recentBookings.recordset);
    
    console.log("\n🎉 All FreakMax data fetched successfully!");
  } catch (err) {
    console.error("❌ Error fetching FreakMax data:", err);
    console.error("Error details:", err.message);
    
    // Additional error information for SQL-specific errors
    if (err.code) {
      console.error("SQL Error Code:", err.code);
    }
    if (err.lineNumber) {
      console.error("Error at line:", err.lineNumber);
    }
  } finally {
    try {
      await sql.close();
      console.log("🔌 Connection closed.");
    } catch (closeErr) {
      console.error("Error closing connection:", closeErr.message);
    }
  }
}

// Run the function
fetchFreakMaxData();
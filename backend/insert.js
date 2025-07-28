const sql = require("mssql");
require("dotenv").config();

// Database configuration
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

// Function to insert sample data into FreakMax database (excluding Users, Cinema, and Movies)
async function seedFreakMaxData() {
  let pool;
  let transaction;

  try {
    console.log("⏳ Connecting to the FreakMax database...");
    pool = await sql.connect(config);
    console.log("✅ Connected to the database");

    // Begin transaction
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    const request = new sql.Request(transaction);

    const queries = [
      {
        query: `INSERT INTO Screens (Cinema_ID, Screen_Category, Total_Seats, Seats_Available) VALUES 
(1, 'Premium', 100, 100),
(2, 'Regular', 200, 200),
(3, 'Regular', 180, 180),
(4, 'Children', 120, 120),
(7, 'Premium', 140, 140);`,
        table: "Screens"
      },
      {
        query: `INSERT INTO Seats (Screen_ID, Seat_Number, Aisle, Seat_Type, Availability_Of_Seat) VALUES 
                (1, 1, 'A', 'Gold', 'Yes'),
            (1, 2, 'A', 'Gold', 'Yes'),
            (1, 3, 'A', 'Silver', 'No'),
            (2, 1, 'B', 'Platinum', 'Yes'),
            (3, 1, 'C', 'Silver', 'Yes'),
            (4, 1, 'D', 'Gold', 'Yes');`,
        table: "Seats"
      },
      {
        query: `INSERT INTO Show_Timings (Cinema_ID, Screen_ID, Movie_ID, Show_Time, Show_Date) VALUES 
                (1, 1, 7, '18:00:00', '2025-03-25'),
                2, 3, 9, '20:30:00', '2025-03-26'),
                (3, 4, 10, '15:45:00', '2025-03-27');`,
        table: "Show_Timings"
      }
    ];

    // Execute each query in the transaction
    for (let q of queries) {
      console.log(`📌 Inserting data into ${q.table}...`);
      await request.query(q.query);
      console.log(`✅ Data inserted into ${q.table}`);
    }

    // Commit the transaction
    await transaction.commit();
    console.log("🎉 Data inserted successfully for Screens, Seats, and Show_Timings tables!");

  } catch (error) {
    console.error("❌ Error executing insert queries:", error);

    if (transaction) {
      console.log("↩️ Rolling back transaction...");
      await transaction.rollback();
      console.log("↩️ Transaction rolled back");
    }

  } finally {
    if (pool) {
      await pool.close();
      console.log("🔌 Connection closed");
    }
  }
}

// Run the seeder function
seedFreakMaxData();
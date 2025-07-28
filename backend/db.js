const sql = require('mssql');
require('dotenv').config();

// SQL Server Configuration
const config = {
    server: process.env.DB_SERVER, 
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: false, // Use false for local SQL Server
        enableArithAbort: true,
    },
    port: parseInt(process.env.DB_PORT),
};

// Connect to Database
const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then((pool) => {
        console.log('Connected to SQL Server');
        return pool;
    })
    .catch((err) => {
        console.log('Database Connection Failed! ', err);
        throw err;
    });

// Exporting both the poolPromise and sql for use in other files
module.exports = {
    sql,
    poolPromise
};

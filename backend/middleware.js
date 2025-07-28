const jwt = require("jsonwebtoken");
require("dotenv").config();

const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey";
let AUTHORIZATION_TOKEN = null; // Stores the latest logged-in token

// Middleware to authenticate users
const authenticateUser = (req, res, next) => {
    const jwt = require("jsonwebtoken"); 
    require("dotenv").config();
    
    const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey";
    const { AUTHORIZATION_TOKEN } = require("./newserver"); // Import token
    
    // Middleware to authenticate users
    const authenticateUser = (req, res, next) => {
        let token = req.header("Authorization")?.split(" ")[1];
    
        // If no token is provided, use stored AUTHORIZATION_TOKEN
        if (!token && AUTHORIZATION_TOKEN) {
            token = AUTHORIZATION_TOKEN;
        }
    
        if (!token) return res.status(403).json({ message: "Access denied. No token provided." });
    
        try {
            const decoded = jwt.verify(token, SECRET_KEY);
            req.user = decoded; // Attach user info to request
            next();
        } catch (err) {
            res.status(401).json({ message: "Invalid token" });
        }
    };
    
};

// Middleware to authorize admin
const authorizeAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admins only." });
    }
    next();
};

// Function to store the latest token
const storeAuthToken = (token) => {
    AUTHORIZATION_TOKEN = token;
};

// Function to clear token on logout
const clearAuthToken = () => {
    AUTHORIZATION_TOKEN = null;
};

module.exports = { authenticateUser, authorizeAdmin, storeAuthToken, clearAuthToken };

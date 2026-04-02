// config/db.js
// Creates and exports the MySQL connection pool for database access
// The connection pool manages multiple database connections for efficiency and reusability

const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * MySQL Connection Pool Configuration
 * Creates a pool of reusable database connections to improve performance
 * Environment variables are used for credentials
 */
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,            // Queue requests when all connections are busy
    connectionLimit: 10,                 // Maximum number of simultaneous connections
    queueLimit: 0,                       // Unlimited queue size (no request gets dropped)
    enableKeepAlive: true,               // Keep connections alive
    keepAliveInitialDelay: 0             // No delay before keep-alive starts
});

// Exports
module.exports = pool;
require("dotenv").config()
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const app = express()
const port = process.env.PORT || 3000;
const path = require('path');

// Middleware
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(express.static(path.join(__dirname, "public")));

// Formal connection pool with database
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,  // queue requests when all connections are busy
    connectionLimit: 10,  // max number of simultaneous connections
    queueLimit: 0  // max number of connection requests in queue
});

// Define a route for GET requests to the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Test route
app.get('/api/test', (req, res) => {
    res.send({ msg: 'API Test: Working' });
});

// DB test route
app.get('/api/db-test', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT 1 AS ok");
        res.json({ status: 'Database Test: Working' })
    }   catch (err) {
        res.status(500).json({ ok: false, error: String(err.message || err) });
    }
});

// Search api call route
app.get('/api/search', async (req, res) => {
    try {
        const searchQuery = req.query.q;

        // Validating search input
        if (!searchQuery || searchQuery.trim().length < 1) {
            return res.json({
                success: false,
                results: [],
                message: 'Please enter at least 1 character'
            });
        }

        // Validation passed
        const searchTerm = `%${searchQuery.trim()}%`;

        // Search in resources table. Searches for query in titles and descriptions
        const sql = `
            SELECT
                'resources' as source,
                resource_id as id,
                title,
                description,
                url
            FROM resources
            WHERE title LIKE ? 
                OR description LIKE ?
            ORDER BY
                CASE
                    WHEN title LIKE ? THEN 1
                    WHEN description LIKE ? THEN 2
                    ELSE 3
                END
            LIMIT 30
        `;

        // Execute the search with parameters
        const [results] = await pool.query(sql, [
            searchTerm,  // for title LIKE
            searchTerm,  // for description LIKE
            `%${searchQuery.trim()}%`,  // for title ordering
            `%${searchQuery.trim()}%`   // for description ordering
        ]);

        res.json({
            success: true,
            results: results,
            total: results.length,
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while searching',
        });
    }
});

// Start the server and listen for incoming requests
app.listen(port, "127.0.0.1", () => {
  console.log(`server listening on http://127.0.0.1 ${port}`);
});

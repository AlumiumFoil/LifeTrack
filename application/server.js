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
app.get('/api/resources/search', async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        const category = (req.query.category || '').trim();
        const contentType = (req.query.content_type || '').trim();

        // Search for query in database table
        let sql = `
            SELECT
                resource_id,
                title,
                description,
                url,
                image_url,
                content_type,
                category
            FROM resources
            WHERE is_public = 1
        `;

        const params = [];

        // Optional filters
        // Keyword filter (titles and descriptions)
        if (q) {
            sql += ` AND (title LIKE ? OR description LIKE ?)`;
            const likeTerm = `%${q}%`;
            params.push(likeTerm, likeTerm);
        }

        // Category filter
        if (category) {
            sql += ` AND category = ?`;
            params.push(category);
        }

        if (contentType) {
            sql += ` AND content_type = ?`;
            params.push(contentType);
        }

        sql += ` ORDER BY created_at DESC LIMIT 50`;

        // Execute the search with parameters
        const [results] = await pool.query(sql, params);

        res.json({
            success: true,
            results,
            total: results.length,
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            results: [],
            total: 0,
            error: 'An error occurred while searching',
        });
    }
});

// Start the server and listen for incoming requests
app.listen(port, "127.0.0.1", () => {
  console.log(`server listening on http://127.0.0.1 ${port}`);
});

require("dotenv").config()
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const app = express()
const port = process.env.PORT || 3000;
const path = require('path');

app.use(cors());
app.use(express.json());

// Define a route for GET requests to the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


app.get('/api/test', (req, res) => {
    res.send({ msg: 'API Test: Working' });
});

app.get('/api/db-test', async (req, res) => {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE
        });

        const [rows] = await conn.query("SELECT 1 AS ok");
        await conn.end();

        res.json({ status: 'Database Test: Working' })
    }   catch (err) {
        res.status(500).json({ ok: false, error: String(err.message || err) });
    }
});

// Start the server and listen for incoming requests
app.listen(port, "127.0.0.1", () => {
  console.log(`server listening on http://127.0.0.1 ${port}`);
});

// server.js
// Main entry point for the application
// Sets up middleware, CORS, security headers, and mounts all routes

require("dotenv").config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import route modules
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const searchRoutes = require('./routes/searchRoutes');
const goalRoutes = require('./routes/goalRoutes');
const wellnessRoutes = require('./routes/wellnessRoutes');
const academicRoutes = require('./routes/academicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const careerRoutes = require('./routes/careerRoutes');


const app = express();
const port = process.env.PORT || 3000;

// CORS Configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || true,  // Allow frontend URL or all in development
    credentials: true                         // Allow cookies/auth headers
}));

// Parse JSON request bodies
app.use(express.json());

// Security headers with Helmet
app.use(helmet({
    hsts: false,
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
    originAgentCluster: false
}));

// Additional security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "public")));


// Routes
// Serve main HTML page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Simple test endpoint to verify API is working
app.get('/api/test', (req, res) => {
    res.send({ msg: 'API Test: Working' });
});

// Database connection test endpoint
app.get('/api/db-test', async (req, res) => {
    try {
        const pool = require('./config/db');
        const [rows] = await pool.query("SELECT 1 AS ok");
        res.json({ status: 'Database Test: Working' });
    } catch (err) {
        res.status(500).json({ ok: false, error: String(err.message || err) });
    }
});

// Mount API routes
app.use('/api/auth', authRoutes);           // Authentication routes
app.use('/api/users', userRoutes);          // User-related routes
app.use('/api/resources', searchRoutes);    // Resource search routes
app.use('/api/goals', goalRoutes);          // Goals routes
app.use('/api/wellness', wellnessRoutes);   // Wellness/Mood routes
app.use('/api/academic', academicRoutes);   // Academic/Study/Task routes
app.use('/api/admin', adminRoutes);         // Admin routes
app.use('/api/resources', resourceRoutes);  // Resource module routes
app.use('/api/career', careerRoutes);       // Career page routes

// Start the server
app.listen(port, "127.0.0.1", () => {
    console.log(`server listening on http://127.0.0.1 ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS Origin: ${process.env.CORS_ORIGIN || 'all origins allowed'}`);
});

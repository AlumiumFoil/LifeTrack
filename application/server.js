require("dotenv").config()
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const crypto = require('crypto'); // Built-in node.js module for password hashing
const app = express()
const port = process.env.PORT || 3000;
const path = require('path');

// Middleware
app.use(cors());
app.use(express.json());
app.use(helmet({
  hsts:false,
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false,
  originAgentCluster: false
}));
app.use(express.static(path.join(__dirname, "public")));

// Formal connection pool with database for efficient access
// The pool maintains multiple connections that can be reused
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

// HELPER FUNCTIONS

/**
 * Hash a password using PBKDF2 with a random salt
 * @param {string} password - Plain text password
 * @returns {string} Hashed password in format "salt:hash"
 */
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
};

/**
 * Verify a password against its stored hash
 * @param {string} password - Plain text password
 * @param {string} storedHash - Stored hash in format "salt:hash"
 * @returns {boolean} True if password matches
 */
const verifyPassword = (password, storedHash) => {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash
}

//Simple authentication check that extracts and validates credentials using HTTP basic auth
const authenticateRequest = async (req, res, next) => {
    try {
        // Get credentials from authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Basic ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Decode base64 credentials (format: "email:password")
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
        const [identifier, password] = credentials.split(':');

        if (!identifier || !password) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials format'
            });
        }

        // Find user by email or username
        const [users] = await pool.query(
            `SELECT
                 account_id,
                 email,
                 username,
                 password_hash,
                 account_status
            FROM user_accounts
            WHERE (email = ? OR username = ?) AND account_status = 'active'`,
            [identifier, identifier]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }
        
        const user = users[0];

        // Verify password with the stored hash
        const isPasswordValid = verifyPassword(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Attach user info to request
        req.user = {
            account_id: user.account_id,
            email: user.email,
            username: user.username
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occured during authentication'
        });
    }
};

// API ROUTES
/** 
 * Serve the main HTML page
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/** 
 * Test endpoint to verify API calls are working
 */
app.get('/api/test', (req, res) => {
    res.send({ msg: 'API Test: Working' });
});

/** 
 * Simple database connection test
 */
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

/**
 * Get a list of premade secuirty questions
 * Returns an array of available security questions for users to choose from
 */
app.get('/api/security-questions', async (req, res) => {
    try{
        // List of premade security questions
        const securityQuestions = [
            "What is the name of your first pet?",
            "What was your first car?",
            "What was your childhood nickname?",
            "What city were you born in?",
            "Where elementary school did you attend?",
            "What is your favorite movie?",
            "What is your favorite book?",
            "What is your mother's maiden name?",
            "What is the name of your best friend from your childhood?",
            "What is your favorite food?",
            "What is your favorite color?",
            "What street did you grow up on?",
            "Who is your favorite musical artist?"
        ];

        res.json({
            success: true,
            questions: securityQuestions
        });
    } catch (error) {
        console.error ('Error fetching security questions:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching security questions'
        });
    }
})

/**
 * Register api call - Create a new user account
 * Request body: { email, username, password, securityQuestions }
 * securityQuestions are an array of objects with question_text and answer
 */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, username, password, securityQuestions } = req.body;

        // Validate required fields
        if (!email || !username || !password || !securityQuestions || !Array.isArray(securityQuestions) || securityQuestions.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address'
            });
        }

        // Validate username length
        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Username must be between 3 and 50 characters'
            });
        }

        // Validate password length
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long'
            });
        }

        // Validate security questions
        for (const sq of securityQuestions) {
            if (!sq.question_text || !sq.answer) {
                return res.status(400).json({
                    success: false,
                    error: 'Each security questions must have both a question and an answer'
                });
            }
            if (sq.answer.length < 2) {
                return res.status(400).json({
                    succcess: false,
                    error: 'Security question answers must be at least 2 characters'
                });
            }
        }

        // Check if email already exists
        const [existingEmail] = await pool.query(
            `SELECT account_id 
            FROM user_accounts 
            WHERE email = ?`,
            [email]
        );
        if (existingEmail.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Check if username already exists
        const [existingUsername] = await pool.query(
            `SELECT account_id
            FROM user_accounts
            WHERE username = ?`,
            [username]
        );
        if (existingUsername.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Username already taken'
            });
        }

        // Hash the password
        const passwordHash = hashPassword(password);

        // Create new user account
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
            const [result] = await connection.query(
                `INSERT INTO user_accounts (email, username, password_hash, account_status, created_at)
                VALUES (?, ?, ?, 'active', NOW())`,
                [email, username, passwordHash]
            );

            const accountId = result.insertId;

            // Insert security questions (hash answers)
            for (const sq of securityQuestions) {
                const answerHash = hashPassword(sq.answer);
                await connection.query(
                    `INSERT INTO user_security_questions (account_id, question_text, answer_hash, created_at)
                    VALUES (?, ?, ?, NOW())`,
                    [accountId, sq.question_text, answerHash]
                );
            }

            // Assign default role
            const [roleResult] = await connection.query(
                `SELECT role_id
                FROM roles
                WHERE role_name = ?`,
                ['college_student']
            );

            if (roleResult.length > 0) {
                await connection.query(
                    `INSERT INTO user_roles (account_id, role_id)
                    VALUES (?, ?)`,
                    [accountId, roleResult[0].role_id]
                );
            }

            // Create default accessibility settings
            await connection.query(
                `INSERT INTO user_accessibility_settings (account_id, theme_mode, text_size, high_contrast_enabled)
                VALUES (?, 'system', 'normal', 0)`,
                [accountId]
            );

            // Create default dashboard
            await connection.query(
                `INSERT INTO dashboards (account_id)
                VALUES (?)`,
                [accountId]
            );

            await connection.commit();

            res.status(201).json({
                success: true,
                message: 'Registration successful',
                user: {
                    account_id: accountId,
                    email: email,
                    username: username,
                    account_status: 'active'
                }
            });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
            console.log('Connection released');
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred during registration'
        });
    }
});

/**
 * User login - Authenticate user credentials
 * Request body: { identifier, password }
 * identifier can be either email or username
 */
app.post('/api/auth/login', async (req, res) => {
    // DEBUG: Log what's being received
    console.log('=== LOGIN DEBUG ===');
    console.log('Request body:', req.body);
    console.log('identifier:', req.body.identifier);
    console.log('password:', req.body.password ? '[HIDDEN]' : 'undefined');
    console.log('Content-Type:', req.headers['content-type']);

    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email/username and password are required'
            });
        }

        // Verify user by email or username
        const [users] = await pool.query(
            `SELECT
                 account_id,
                 email,
                 username,
                 password_hash,
                 account_status
            FROM user_accounts
            WHERE (email = ? OR username = ?) AND account_status = 'active'`,
            [identifier, identifier]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        const user = users[0];

        // Verify password
        const isPasswordValid = verifyPassword(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Return user info
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                account_id: user.account_id,
                email: user.email,
                username: user.username,
                account_status: user.account_status
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred during login'
        });
    }
});

// Start the server and listen for incoming requests
app.listen(port, "127.0.0.1", () => {
  console.log(`server listening on http://127.0.0.1 ${port}`);
});

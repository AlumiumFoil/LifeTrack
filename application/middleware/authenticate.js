// middleware/authenticate.js
// Handles all authentication-related functionality
// Using bcrypt for password hashing and JWT for stateless auth

const crypto = require('crypto'); // used for JWT signing and token generation
const bcrypt = require('bcrypt'); // used for password hashing
const pool = require('../config/db');
require('dotenv').config();


// JWT Configuration
// JWT Secret - store in .env for security
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Token expiration times in seconds
const ACCESS_TOKEN_EXPIRY = 60 * 60; // 1 hour
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

// In-memory refresh token blacklist for logout
const refreshTokenBlacklist = new Set();

// Clean up expired blacklist entries periodically (every hour)
setInterval(() => {
    refreshTokenBlacklist.clear();
}, 60 * 60 * 1000);


// Password Helper Functions
/**
 * Hash a password using bcrypt. This returns a bcrypt hash string that 
 * can be stored directly in user_accounts.password_hash
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Bcrypt password hash
 */
const hashPassword = async (password) => {
     return bcrypt.hash(password, BCRYPT_ROUNDS);
};

/**
 * Verify a password against its stored hash
 * @param {string} password - Plain text password
 * @param {string} storedHash - Stored bcrypt hash 
 * @returns {boolean} True if password matches
 */
const verifyPassword = async (password, storedHash) => {
    return bcrypt.compare(password, storedHash);
};


// JWT Helper Functions
/**
 * Get client IP address from request
 * Used for token fingerprinting to prevent token theft across devices
 * @param {object} req - Express request object
 * @returns {string} Client IP address
 */
const getClientIP = (req) => {
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
};

/**
 * Generate a JWT access token for a user
 * Includes fingerprinting (IP + UserAgent) to bind token to device
 * JWT Structure: header.payload.signature (HS256 algorithm)
 * @param {number} accountId - User's account ID
 * @param {string} email - User's email
 * @param {string} username - User's username
 * @param {string} userAgent - User's browser user agent
 * @param {string} ipAddress - User's IP address
 * @returns {string} JWT access token
 */
const generateAccessToken = (accountId, email, username, userAgent, ipAddress) => {
    const payload = {
        accountId,
        email,
        username,
        type: 'access',                         // Token type for validation
        fingerprint: crypto                     // Device fingerprint
            .createHash('sha256')
            .update(`${userAgent}${ipAddress}`)
            .digest('hex'),
        iat: Math.floor(Date.now() / 1000),                      // Issued at timestamp
        exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRY // Expiration timestamp
    };
    
    const header = { alg: 'HS256', typ: 'JWT' }; // Specify algorithm and token type in header
    const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');

    // Signatures ensure that token has not been tampered with
    const signature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${headerEncoded}.${payloadEncoded}`)
        .digest('base64url');
    
    return `${headerEncoded}.${payloadEncoded}.${signature}`;
};

/**
 * Verify and decode a JWT access token
 * Validates signature, expiration, and device fingerprint
 * @param {string} token - JWT token to verify
 * @param {string} userAgent - User's browser user agent
 * @param {string} ipAddress - User's IP address
 * @returns {object|null} Decoded payload or null if invalid
 */
const verifyAccessToken = (token, userAgent, ipAddress) => {
    try {
        const [headerEncoded, payloadEncoded, signature] = token.split('.');
        
        if (!headerEncoded || !payloadEncoded || !signature) return null;
        
        // Verify that the signature matches expected value
        const expectedSignature = crypto
            .createHmac('sha256', JWT_SECRET)
            .update(`${headerEncoded}.${payloadEncoded}`)
            .digest('base64url');
        
        if (signature !== expectedSignature) return null;
        
        // Decode and parse payload
        const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString());
        
        if (payload.type !== 'access') return null;                   // Validate token type
        if (payload.exp < Math.floor(Date.now() / 1000)) return null; // Check if token has expired
        
        // Validate device fingerprint
        const expectedFingerprint = crypto
            .createHash('sha256')
            .update(`${userAgent}${ipAddress}`)
            .digest('hex');
        
        if (payload.fingerprint !== expectedFingerprint) return null;
        
        return payload;
    } catch (error) {
        return null;
    }
};

/**
 * Generate a refresh token
 * Refresh tokens are long-lived and can be revoked
 * @param {number} accountId - User's account ID
 * @returns {Promise<string>} Refresh token string
 */
const generateRefreshToken = async (accountId) => {
    const refreshToken = crypto.randomBytes(64).toString('hex'); // 64-byte random token
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000);
    
    // Store in database if token needs to be revoked
    await pool.query(
        `INSERT INTO refresh_tokens (account_id, token, expires_at, created_at)
         VALUES (?, ?, ?, NOW())`,
        [accountId, refreshToken, expiresAt]
    );
    
    return refreshToken;
};

/**
 * Verify a refresh token
 * @param {string} token - Refresh token to verify
 * @returns {Promise<object|null>} Token data with user info or null if invalid
 */
const verifyRefreshToken = async (token) => {
    // Check if token was explicitly invalidated
    // Logout would be considered explicitly invalidated
    if (refreshTokenBlacklist.has(token)) return null;
    
    // Query the database for a valid token
    const [tokens] = await pool.query(
        `SELECT rt.account_id, rt.token, rt.expires_at, u.email, u.username, u.account_status
         FROM refresh_tokens rt
         JOIN user_accounts u ON rt.account_id = u.account_id
         WHERE rt.token = ? AND rt.expires_at > NOW()`,
        [token]
    );
    
    if (tokens.length === 0) return null;
    if (tokens[0].account_status !== 'active') return null;
    
    return tokens[0];
};

/**
 * Invalidate a refresh token
 * An action like logging out would invalidate a refresh token
 * @param {string} token - Refresh token to invalidate
 */
const invalidateRefreshToken = async (token) => {
    refreshTokenBlacklist.add(token);

    // Remove refresh token from database
    await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
};

/**
 * Invalidate all refresh tokens for a user
 * A user logging out from all devices would invalidate all their refresh tokens
 * @param {number} accountId - User's account ID
 */
const invalidateAllUserRefreshTokens = async (accountId) => {
    const [tokens] = await pool.query(
        'SELECT token FROM refresh_tokens WHERE account_id = ?',
        [accountId]
    );
    
    for (const token of tokens) {
        refreshTokenBlacklist.add(token.token);
    }

    // Delete all user tokens from the database
    await pool.query('DELETE FROM refresh_tokens WHERE account_id = ?', [accountId]);
};


// Authentication middleware
/**
 * JWT authentication middleware
 * Checks for Bearer token and validates it
 * Attaches user info to req.user if valid
 * Used to protect routes that require authentication
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const authenticateJWT = async (req, res, next) => {
    try {
        // Extract token from auth header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        
        const token = authHeader.split(' ')[1];
        const userAgent = req.headers['user-agent'] || 'unknown';
        const ipAddress = getClientIP(req);
        
        // Verify token
        const decoded = verifyAccessToken(token, userAgent, ipAddress);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        
        // Verify user still exists and is active
        const [users] = await pool.query(
            `SELECT account_id, email, username, account_status 
             FROM user_accounts 
             WHERE account_id = ? AND account_status = 'active'`,
            [decoded.accountId]
        );
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'User no longer exists or account is inactive'
            });
        }
        
        const user = users[0];
        
        // Attach user info to request
        req.user = {
            account_id: user.account_id,
            email: user.email,
            username: user.username
        };
        
        next();
    } catch (error) {
        console.error('JWT Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred during authentication'
        });
    }
};

// Exports
module.exports = {
    // Password helpers
    hashPassword,
    verifyPassword,
    
    // JWT helpers
    getClientIP,
    generateAccessToken,
    verifyAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    invalidateRefreshToken,
    invalidateAllUserRefreshTokens,
    
    // Middleware
    authenticateJWT
};
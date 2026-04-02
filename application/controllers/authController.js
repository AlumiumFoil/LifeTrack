// controllers/authController.js
// Handles all authentication-related business logic
// Manages user registration, login, token refresh, and logout

const pool = require('../config/db');
const userModel = require('../models/userModel');
const academicModel = require('../models/academicModel');
const {
    hashPassword,
    verifyPassword,
    getClientIP,
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    invalidateRefreshToken,
    invalidateAllUserRefreshTokens
} = require('../middleware/authenticate');


// Validation Helper Functions
/**
 * Validate email format
 * @param {string} email - User email
 * @returns {boolean} True if email format is valid
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate username length
 * @param {string} username - Username to validate
 * @returns {boolean} True if username is between 3 and 50 characters
 */
const isValidUsername = (username) => {
    return username.length >= 3 && username.length <= 50;
};

/**
 * Validate password strength
 * @param {string} password - User password
 * @returns {boolean} True if password is at least 8 characters
 */
const isValidPassword = (password) => {
    return password.length >= 8;
};

/**
 * Validate security questions
 * @param {Array} securityQuestions - Array of security question objects
 * @returns {boolean} True if all questions have text and answers of sufficient length
 */
const isValidSecurityQuestions = (securityQuestions) => {
    if (!Array.isArray(securityQuestions) || securityQuestions.length === 0) {
        return false;
    }
    
    for (const sq of securityQuestions) {
        if (!sq.question_text || !sq.answer) {
            return false;
        } // A security question entry must contain a question and answer from the user
        if (sq.answer.length < 2) {
            return false;
        } // Minimum length for answers is 2 characters
    }
    return true;
};


// Route Handlers
/**
 * Register a new user
 * POST /api/auth/register
 * Input: { email, username, password, securityQuestions }
 * Output: { success, message, accessToken, refreshToken, user }
 */
const register = async (req, res) => {
    try {
        const { email, username, password, securityQuestions } = req.body;

        // Input validation for required fields
        if (!email || !username || !password || !securityQuestions) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: email, username, password, and security question(s) are required'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address format'
            });
        }

        if (!isValidUsername(username)) {
            return res.status(400).json({
                success: false,
                error: 'Username must be between 3 and 50 characters'
            });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long'
            });
        }

        if (!isValidSecurityQuestions(securityQuestions)) {
            return res.status(400).json({
                success: false,
                error: 'Each security question must have both a question and an answer (minimum 2 characters)'
            });
        }

        // Check for uniqueness in email and usernam
        const emailExists = await userModel.emailExists(email);
        if (emailExists) {
            return res.status(409).json({
                success: false,
                error: 'Email already registered'
            });
        }

        const usernameExists = await userModel.usernameExists(username);
        if (usernameExists) {
            return res.status(409).json({
                success: false,
                error: 'Username already taken'
            });
        }

        // Start database transaction to create a new user account
        const passwordHash = await hashPassword(password);
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Create user account
            const accountId = await userModel.createUser(email, username, passwordHash);

            // Hash security question answers and insert
            const questionsWithHashes = [];
            for (const sq of securityQuestions) {
                questionsWithHashes.push({
                    question_text: sq.question_text,
                    answer_hash: await hashPassword(sq.answer)
                });
            }
            await academicModel.insertSecurityQuestions(accountId, questionsWithHashes, connection);

            // Assign default role of college_student
            const roleId = await academicModel.getRoleIdByName('college_student');
            if (roleId) {
                await academicModel.assignRoleToUser(accountId, roleId);
            }

            // Create default accessibility settings
            await academicModel.createDefaultAccessibilitySettings(accountId, connection);

            // Create default dashboard
            await academicModel.createDefaultDashboard(accountId, connection);

            await connection.commit();

            // Generate authentication tokens
            const userAgent = req.headers['user-agent'] || 'unknown';
            const ipAddress = getClientIP(req);
            const accessToken = generateAccessToken(accountId, email.toLowerCase(), username, userAgent, ipAddress);
            const refreshToken = await generateRefreshToken(accountId);

            res.status(201).json({
                success: true,
                message: 'Registration successful',
                accessToken: accessToken,
                refreshToken: refreshToken,
                user: {
                    account_id: accountId,
                    email: email.toLowerCase(),
                    username: username,
                    account_status: 'active'
                }
            });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred during registration'
        });
    }
};

/**
 * Login user
 * POST /api/auth/login
 * Input: { identifier, password } (identifier can be email or username)
 * Output: { success, message, accessToken, refreshToken, user }
 */
const login = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        // Input validation
        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email/username and password are required'
            });
        }

        // Find user by email or username
        const users = await userModel.findUserByIdentifier(identifier);
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        const user = users[0];

        // Verify password
        const isPasswordValid = await verifyPassword(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Invalidate any existing refresh tokens
        await invalidateAllUserRefreshTokens(user.account_id);

        // Generate new tokens
        const userAgent = req.headers['user-agent'] || 'unknown';
        const ipAddress = getClientIP(req);
        const accessToken = generateAccessToken(user.account_id, user.email, user.username, userAgent, ipAddress);
        const refreshToken = await generateRefreshToken(user.account_id);

        res.json({
            success: true,
            message: 'Login successful',
            accessToken: accessToken,
            refreshToken: refreshToken,
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
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 * Input: { refreshToken }
 * Output: { success, accessToken }
 */
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: refreshTokenValue } = req.body;

        if (!refreshTokenValue) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token is required'
            });
        }

        const tokenData = await verifyRefreshToken(refreshTokenValue);
        if (!tokenData) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired refresh token'
            });
        }

        // Generate new access token
        const userAgent = req.headers['user-agent'] || 'unknown';
        const ipAddress = getClientIP(req);
        const newAccessToken = generateAccessToken(
            tokenData.account_id,
            tokenData.email,
            tokenData.username,
            userAgent,
            ipAddress
        );

        res.json({
            success: true,
            accessToken: newAccessToken
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while refreshing token'
        });
    }
};

/**
 * Logout user
 * POST /api/auth/logout
 * Input: { refreshToken } (optional)
 * Output: { success, message }
 */
const logout = async (req, res) => {
    try {
        const { refreshToken: refreshTokenValue } = req.body;

        if (refreshTokenValue) {
            await invalidateRefreshToken(refreshTokenValue);
        }

        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred during logout'
        });
    }
};

/**
 * Logout from all devices
 * POST /api/auth/logout-all
 * Requires authentication (valid access token)
 * Output: { success, message }
 */
const logoutAll = async (req, res) => {
    try {
        await invalidateAllUserRefreshTokens(req.user.account_id);

        res.json({
            success: true,
            message: 'Logged out from all devices successfully'
        });
    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred during logout'
        });
    }
};

/**
 * Get current user info
 * GET /api/auth/me
 * Requires authentication via access token
 * Output: { success, user }
 */
const getCurrentUser = async (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
};

/**
 * Get current user's roles
 * GET /api/users/me/roles
 * Requires authentication via access token
 * Output: { success, roles }
 */
const getUserRoles = async (req, res) => {
    try {
        const roles = await academicModel.getUserRoles(req.user.account_id);

        res.json({
            success: true,
            roles: roles
        });
    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({
            success: false,
            error: 'An error has occurred'
        });
    }
};

// Exports
module.exports = {
    register,
    login,
    refreshToken,
    logout,
    logoutAll,
    getCurrentUser,
    getUserRoles
};
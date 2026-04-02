// routes/authRoutes.js
// Defines all authentication-related API routes
// Routes are prefixed with /api/auth

const express = require('express');
const authController = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/authenticate');

const router = express.Router();


// Public Auth Routes - No authentication required
/**
 * POST /api/auth/register
 * Register a new user account
 * Input: { email, username, password, securityQuestions }
 * Output: { success, message, accessToken, refreshToken, user }
 */
router.post('/register', authController.register);

/**
 * POST /api/auth/login
 * Authenticate user and receive JWT tokens
 * Input: { identifier, password }
 * Output: { success, message, accessToken, refreshToken, user }
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/refresh
 * Get a new access token using a refresh token
 * Input: { refreshToken }
 * Output: { success, accessToken }
 */
router.post('/refresh', authController.refreshToken);


// Protected Auth Routes - Requires a valid JWT token
/**
 * POST /api/auth/logout
 * Logout user - invalidate refresh token
 * Input: { refreshToken } (optional)
 * Output: { success, message }
 */
router.post('/logout', authController.logout);

/**
 * POST /api/auth/logout-all
 * Logout from all devices - invalidates all refresh tokens
 * Requires authentication
 * Output: { success, message }
 */
router.post('/logout-all', authenticateJWT, authController.logoutAll);

/**
 * GET /api/auth/me
 * Get current authenticated user's info
 * Requires authentication
 * Output: { success, user }
 */
router.get('/me', authenticateJWT, authController.getCurrentUser);

// Exports
module.exports = router;
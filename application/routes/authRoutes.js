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

/**
 * POST /api/auth/password-reset/initiate
 * Initiate password reset for unauthenticated users
 * Input: { identifier } (email or username)
 * Output: { success, accountId, securityQuestions }
 */
router.post('/password-reset/initiate', authController.initiatePasswordReset);

/**
 * POST /api/auth/password-reset/verify
 * Verify security answers and get reset token
 * Input: { accountId, answers }
 * Output: { success, resetToken, expiresInMinutes }
 */
router.post('/password-reset/verify', authController.verifyPasswordResetAnswers);

/**
 * POST /api/auth/password-reset/complete
 * Reset password using reset token
 * Input: { resetToken, newPassword }
 * Output: { success, message }
 */
router.post('/password-reset/complete', authController.completePasswordReset);

// Exports
module.exports = router;
// routes/userRoutes.js
// Defines all user-related API routes
// Routes are prefixed with /api/users

const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const { authenticateJWT } = require('../middleware/authenticate');
const {uploadSingleProfileImage} = require('../middleware/profileImageUpload');

const router = express.Router();


// Public User Routes - No authentication required
/**
 * GET /api/users/security-questions
 * Get list of premade security questions for registration
 * Output: { success, questions }
 */
router.get('/security-questions', userController.getSecurityQuestions);

/**
 * GET /api/users/bcrypt-test
 * Confirms bcrypt is installed and working correctly
 * Hashes a test value and verifies both a matching and non-matching password
 * No authentication required
 * Output: { success, bcryptWorking, details }
 */
router.get('/bcrypt-test', userController.bcryptTest);

// Protected User Routes - Requires a valid JWT token
/**
 * GET /api/users/me/roles
 * Get current user's assigned role
 * Requires authentication
 * Output: { success, roles }
 */
router.get('/me/roles', authenticateJWT, authController.getUserRoles);

/**
 * GET /api/users/me/dashboard
 * Return one complete dashboard for the authenticated user
 * Requires authentication
 * Output: { success, dashboard }
 */
router.get('/me/dashboard', authenticateJWT, userController.getDashboard);

/**
 * POST /api/users/me/profile-image
 * Upload a profile image for the authenticated user
 * Expects multipart/form-data with a single file field named profileImage
 * Requires authentication
 * Output: { success, message, image }
 */
router.post(
    '/me/profile-image',
    authenticateJWT,
    uploadSingleProfileImage,
    userController.uploadProfileImage
);

/**
 * GET /api/users/me/profile
 * Get current user's complete profile
 * Requires authentication
 * Output: { success, profile }
 */
router.get('/me/profile', authenticateJWT, userController.getUserProfile);

/**
 * PUT /api/users/me/profile
 * Update current user's profile 
 * Requires authentication
 * Input: { name, major, year, university }
 * Output: { success, message, profile }
 */
router.put('/me/profile', authenticateJWT, userController.updateUserProfile);

/**
 * PUT /api/users/me/password
 * Change user's password
 * Requires authentication
 * Input: { currentPassword, newPassword }
 * Output: { success, message }
 */
router.put('/me/password', authenticateJWT, userController.changePassword);

/**
 * GET /api/users/me/accessibility
 * Get user's accessibility settings
 * Requires authentication
 * Output: { success, accessibility }
 */
router.get('/me/accessibility', authenticateJWT, userController.getAccessibilitySettings);

/**
 * PUT /api/users/me/accessibility
 * Update user's accessibility settings
 * Requires authentication
 * Input: { themeMode?, textSize?, highContrastEnabled? }
 * Output: { success, message, accessibility }
 */
router.put('/me/accessibility', authenticateJWT, userController.updateAccessibilitySettings);

/**
 * GET /api/users/me/security-questions
 * Get current user's security questions
 * Requires authentication
 * Output: { success, securityQuestions }
 */
router.get('/me/security-questions', authenticateJWT, userController.getUserSecurityQuestions);

/**
 * PUT /api/users/me/security-questions
 * Update current user's security question answers
 * Requires authentication
 * Input: { securityQuestions: [{ questionId, answer }] }
 * Output: { success, message, securityQuestions }
 */
router.put('/me/security-questions', authenticateJWT, userController.updateUserSecurityQuestions);

module.exports = router;
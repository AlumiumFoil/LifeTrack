// routes/userRoutes.js
// Defines all user-related API routes
// Routes are prefixed with /api/users

const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const { authenticateJWT } = require('../middleware/authenticate');

const router = express.Router();


// Public User Routes - No authentication required
/**
 * GET /api/users/security-questions
 * Get list of premade security questions for registration
 * Output: { success, questions }
 */
router.get('/security-questions', userController.getSecurityQuestions);


// Protected User Routes - Requires a valid JWT token
/**
 * GET /api/users/me/roles
 * Get current user's assigned role
 * Requires authentication
 * Output: { success, roles }
 */
router.get('/me/roles', authenticateJWT, authController.getUserRoles);

module.exports = router;
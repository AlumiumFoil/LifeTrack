// routes/adminRoutes.js
// Defines admin API routes
// These routes are mounted in server.js under /api/admin

const express = require('express');
const adminController = require('../controllers/adminController');
const {authenticateJWT} = require('../middleware/authenticate');
const {authorizeAdmin} = require('../middleware/authorize');

const router = express.Router();

/**
 * GET /api/admin/stats
 * Return admin summary stats
 * Requires authentication and administrator access
 * Output: {success, stats}
 */
router.get('/stats', authenticateJWT, authorizeAdmin, adminController.getAdminStats);

/**
 * GET /api/admin/users
 * Return filtered admin user list
 * Optional query parameters: name, email, registration date, status
 * Requires authentication and administrator access
 * Output: {success, users}
 */
router.get('/users', authenticateJWT, authorizeAdmin, adminController.getAdminUsers);

/**
 * GET /api/admin/users/:id
 * Return a user detail record by account ID
 * Requires authentication and administrator access
 * Output: {success, user}
 */
router.get('/users/:id', authenticateJWT, authorizeAdmin, adminController.getAdminUserById);

module.exports = router;
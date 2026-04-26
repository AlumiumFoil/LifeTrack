// routes/careerRoutes.js
// Defines all Career page API routes
// Routes are prefixed with /api/career (mounted in server.js)

const express = require('express');
const careerController = require('../controllers/careerController');
const { authenticateJWT } = require('../middleware/authenticate');

const router = express.Router();

/**
 * GET /api/career/resources
 * Fetch all public Career-category resources
 * No authentication required
 * Output: { success, resources[], total }
 */
router.get('/resources', careerController.getCareerResources);

/**
 * GET /api/career/goals
 * Fetch the authenticated user's Career-category goals
 * Requires authentication (JWT token)
 * Output: { success, goals[], total }
 */
router.get('/goals', authenticateJWT, careerController.getCareerGoals);

module.exports = router;

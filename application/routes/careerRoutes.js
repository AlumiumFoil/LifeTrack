// routes/careerRoutes.js
// Defines career endpoints
// Routes are mounted in server.js under /api/career

const express = require('express');
const careerController = require('../controllers/careerController');
const { authenticateJWT } = require('../middleware/authenticate');

const router = express.Router();

/**
 * GET /api/career/resources
 * Return public career resources
 * Output: { success, resources }
 */
router.get('/resources', careerController.getCareerResources);

/**
 * GET /api/career/goals
 * Get all career goals for the authenticated user
 * Requires authentication
 * Output: { success, goals }
 */
router.get('/goals', authenticateJWT, careerController.getCareerGoals);

/**
 * GET /api/career/goals/:id
 * Get one career goal for the authenticated user
 * Requires authentication
 * Output: { success, goal }
 */
router.get('/goals/:id', authenticateJWT, careerController.getCareerGoalById);

/**
 * POST /api/career/goals
 * Create a new career goal
 * Requires authentication
 * Input: { title, description, targetRole, status, targetDate }
 * Output: { success, message, careerGoalId }
 */
router.post('/goals', authenticateJWT, careerController.createCareerGoal);

/**
 * PUT /api/career/goals/:id
 * Update an existing career goal
 * Requires authentication
 * Input: { title?, description?, targetRole?, status?, targetDate? }
 * Output: { success, message }
 */
router.put('/goals/:id', authenticateJWT, careerController.updateCareerGoal);

/**
 * DELETE /api/career/goals/:id
 * Delete a career goal
 * Requires authentication
 * Output: { success, message }
 */
router.delete('/goals/:id', authenticateJWT, careerController.deleteCareerGoal);

module.exports = router;
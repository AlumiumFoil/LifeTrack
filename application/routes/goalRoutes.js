// routes/goalRoutes.js
// Defines all goal-related API routes
// Routes are prefixed with /api/goals

const express = require('express');
const goalController = require('../controllers/goalController');
const { authenticateJWT } = require('../middleware/authenticate');

const router = express.Router();

// All goal routes require authentication
router.use(authenticateJWT);

/**
 * GET /api/goals
 * Get all goals for authenticated user
 * Returns goals sorted by target date (soonest first) and creation date
 * Requires authentication
 * Output: { success, goals, stats }
 *   - goals: Array of goal objects with id, title, description, status, targetDate, notes
 *   - stats: Object with total, inProgress, completed counts
 */
router.get('/', goalController.getGoals);

/**
 * GET /api/goals/:id
 * Get a single goal by ID
 * Requires authentication
 * URL Parameter: id - The goal ID
 * Output: { success, goal }
 */
router.get('/:id', goalController.getGoalById);

/**
 * POST /api/goals
 * Create a new goal
 * Requires authentication
 * Input: { title, description, status, targetDate, notes }
 *   - title: string (required, max 255 chars)
 *   - description: string (optional)
 *   - status: string (optional, default 'not started' - allowed: 'not started', 'in progress', 'completed')
 *   - targetDate: date (optional, format YYYY-MM-DD)
 *   - notes: string (optional)
 * Output: { success, message, goalId }
 */
router.post('/', goalController.createGoal);

/**
 * PUT /api/goals/:id
 * Update an existing goal
 * Requires authentication
 * URL Parameter: id - The goal ID
 * Input: { title, description, status, targetDate, notes } (all optional, only provided fields will update)
 *   - title: string (max 255 chars)
 *   - description: string
 *   - status: string (allowed: 'not started', 'in progress', 'completed')
 *   - targetDate: date (format YYYY-MM-DD)
 *   - notes: string
 * Output: { success, message }
 */
router.put('/:id', goalController.updateGoal);

/**
 * DELETE /api/goals/:id
 * Delete a goal
 * Requires authentication
 * URL Parameter: id - The goal ID
 * Output: { success, message }
 */
router.delete('/:id', goalController.deleteGoal);

module.exports = router;
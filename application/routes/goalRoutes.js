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
 * GET /api/goals/projects/stats
 * Get project statistics
 * Requires authentication
 * Output: { success, stats }
 */
router.get('/projects/stats', goalController.getProjectStats);

/**
 * GET /api/goals/projects
 * Get all projects for authenticated user
 * Requires authentication
 * Output: { success, projects }
 */
router.get('/projects', goalController.getProjects);

/**
 * GET /api/goals/projects/:id
 * Get a single project by ID
 * Requires authentication
 * Output: { success, project }
 */
router.get('/projects/:id', goalController.getProjectById);

/**
 * POST /api/goals/projects
 * Create a new project
 * Requires authentication
 * Input: { title, description, groupMembers, memberRoles, gitUrl }
 * Output: { success, message, projectId }
 */
router.post('/projects', goalController.createProject);

/**
 * PUT /api/goals/projects/:id
 * Update an existing project
 * Requires authentication
 * Input: { title, description, groupMembers, memberRoles, gitUrl, status }
 * Output: { success, message }
 */
router.put('/projects/:id', goalController.updateProject);

/**
 * DELETE /api/goals/projects/:id
 * Delete a project (soft delete)
 * Requires authentication
 * Output: { success, message }
 */
router.delete('/projects/:id', goalController.deleteProject);

/**
 * GET /api/goals/projects/:projectId/milestones
 * Get all milestones for a specific project
 * Requires authentication
 * Output: { success, milestones }
 */
router.get('/projects/:projectId/milestones', goalController.getMilestonesByProject);

/**
 * POST /api/goals/projects/:projectId/milestones
 * Create a new milestone for a project
 * Requires authentication
 * Input: { title, description, dueDate, status, sortOrder }
 * Output: { success, message, milestoneId }
 */
router.post('/projects/:projectId/milestones', goalController.createMilestone);

/**
 * GET /api/goals/milestones
 * Get all milestones for authenticated user (across all projects)
 * Requires authentication
 * Output: { success, milestones }
 */
router.get('/milestones', goalController.getAllMilestones);

/**
 * PUT /api/goals/milestones/:id
 * Update an existing milestone
 * Requires authentication
 * Input: { title, description, dueDate, status, sortOrder }
 * Output: { success, message }
 */
router.put('/milestones/:id', goalController.updateMilestone);

/**
 * DELETE /api/goals/milestones/:id
 * Delete a milestone
 * Requires authentication
 * Output: { success, message }
 */
router.delete('/milestones/:id', goalController.deleteMilestone);

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
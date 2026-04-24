// routes/wellnessRoutes.js
// Defines all wellness-related API routes
// Routes are prefixed with /api/wellness

const express = require('express');
const wellnessController = require('../controllers/wellnessController');
const { authenticateJWT } = require('../middleware/authenticate');

const router = express.Router();

/**
 * POST /api/wellness/checkin
 * Submit a daily mood check-in
 * Requires authentication
 * Input: { mood, note }
 *   - mood: string (required - Great, Good, Okay, Low, Struggling)
 *   - note: string (optional)
 * Output: { success, message, entryId }
 */
router.post('/checkin', authenticateJWT, wellnessController.submitCheckin);

/**
 * GET /api/wellness/checkins
 * Get mood check-in history for the user (last 30 days)
 * Requires authentication
 * Output: { success, history, todayCheckin }
 */
router.get('/checkins', authenticateJWT, wellnessController.getCheckinHistory);

/**
 * GET /api/wellness/habits
 * Get all habits for authenticated user
 * Requires authentication
 * Output: { success, habits, stats }
 */
router.get('/habits', authenticateJWT, wellnessController.getHabits);

/**
 * GET /api/wellness/habits/:id
 * Get a single habit by ID
 * Requires authentication
 * Output: { success, habit }
 */
router.get('/habits/:id', authenticateJWT, wellnessController.getHabitById);

/**
 * POST /api/wellness/habits
 * Create a new habit
 * Requires authentication
 * Input: { title, description, category, frequency }
 * Output: { success, message, habitId }
 */
router.post('/habits', authenticateJWT, wellnessController.createHabit);

/**
 * PUT /api/wellness/habits/:id
 * Update an existing habit
 * Requires authentication
 * Input: { title, description, category, frequency, status }
 * Output: { success, message }
 */
router.put('/habits/:id', authenticateJWT, wellnessController.updateHabit);

/**
 * DELETE /api/wellness/habits/:id
 * Delete a habit (soft delete)
 * Requires authentication
 * Output: { success, message }
 */
router.delete('/habits/:id', authenticateJWT, wellnessController.deleteHabit);

/**
 * POST /api/wellness/habits/:id/complete
 * Mark habit as completed for today
 * Requires authentication
 * Output: { success, message, streak }
 */
router.post('/habits/:id/complete', authenticateJWT, wellnessController.completeHabit);

/**
 * GET /api/wellness/resources
 * Get curated wellness resources and tips
 * No authentication required
 * Output: { success, resources }
 */
router.get('/resources', wellnessController.getWellnessResources);

module.exports = router;
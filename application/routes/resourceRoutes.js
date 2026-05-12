// routes/resourceRoutes.js
// Defines resource module endpoints
// These routes are mounted in server.js under /api/resources

const express = require('express');
const resourceModuleController = require('../controllers/resourceController');
const { authenticateJWT } = require('../middleware/authenticate');

const router = express.Router();

/**
 * GET /api/resources/modules/resume
 * Return resume resource metadata and resume prefill data
 * Requires authentication
 * Output: { success, resource, prefill }
 */
router.get('/modules/resume', authenticateJWT, resourceModuleController.getResumeModule);

/**
 * GET /api/resources/modules/wellness-check-in
 * Return wellness module metadata and wellness check-in data
 * Requires authentication
 * Output: { success, resource, todayCheckin, history }
 */
router.get(
    '/modules/wellness-check-in',
    authenticateJWT,
    resourceModuleController.getWellnessCheckInModule
);

/**
 * GET /api/resources/modules/sleep-routine
 * Return sleep routine metadata and sleep related habits
 * Requires authentication
 * Output: { success, resource, habits }
 */
router.get(
    '/modules/sleep-routine',
    authenticateJWT,
    resourceModuleController.getSleepRoutineModule
);

/**
 * POST /api/resources/modules/sleep-routine/habits
 * Create a sleep routine habit
 * Requires authentication
 * Input: { title, description?, frequency? }
 * Output: { success, message, habitId }
 */
router.post(
    '/modules/sleep-routine/habits',
    authenticateJWT,
    resourceModuleController.createSleepRoutineHabit
);

/**
 * POST /api/resources/modules/sleep-routine/habits/:id/complete
 * Mark a sleep routine habit as completed today
 * Requires authentication
 * Output: { success, message, streak }
 */
router.post(
    '/modules/sleep-routine/habits/:id/complete',
    authenticateJWT,
    resourceModuleController.completeSleepRoutineHabit
);

module.exports = router;
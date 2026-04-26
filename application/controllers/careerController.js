// controllers/careerController.js
// Handles Career page data requests
// Provides public career resources and authenticated user's career goals

const careerModel = require('../models/careerModel');

/**
 * GET /api/career/resources
 * Returns all public resources in the Career category
 * No authentication required
 * Output: { success, resources[], total }
 */
const getCareerResources = async (req, res) => {
    try {
        const resources = await careerModel.getCareerResources();

        res.json({
            success: true,
            resources,
            total: resources.length
        });
    } catch (error) {
        console.error('Career resources error:', error.message);
        res.status(500).json({
            success: false,
            resources: [],
            total: 0,
            error: 'Could not load career resources.'
        });
    }
};

/**
 * GET /api/career/goals
 * Returns the authenticated user's goals in the Career category
 * Requires a valid JWT token (via authenticateJWT middleware)
 * Output: { success, goals[], total }
 */
const getCareerGoals = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const goals = await careerModel.getCareerGoals(accountId);

        res.json({
            success: true,
            goals,
            total: goals.length
        });
    } catch (error) {
        console.error('Career goals error:', error.message);
        res.status(500).json({
            success: false,
            goals: [],
            total: 0,
            error: 'Could not load career goals.'
        });
    }
};

module.exports = {
    getCareerResources,
    getCareerGoals
};

// controllers/goalController.js
// Handles business logic for goal operations

const goalModel = require('../models/goalModel');

/**
 * Helper: Validate goal status
 * @param {string} status - Status to validate
 * @returns {boolean} True if valid
 */
const isValidStatus = (status) => {
    const validStatuses = ['not started', 'in progress', 'completed'];
    return !status || validStatuses.includes(status.toLowerCase());
};

/**
 * Get all goals for authenticated user
 * GET /api/goals
 * Requires authentication
 * Output: { success, goals, stats }
 */
const getGoals = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        
        const [goals, stats] = await Promise.all([
            goalModel.getGoalsByUserId(accountId),
            goalModel.getGoalStats(accountId)
        ]);
        
        res.json({
            success: true,
            goals,
            stats
        });
    } catch (error) {
        console.error('Get goals error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching goals'
        });
    }
};

/**
 * Get a single goal by ID
 * GET /api/goals/:id
 * Requires authentication
 * Output: { success, goal }
 */
const getGoalById = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const goalId = req.params.id;
        
        const goal = await goalModel.getGoalById(goalId, accountId);
        
        if (!goal) {
            return res.status(404).json({
                success: false,
                error: 'Goal not found'
            });
        }
        
        res.json({
            success: true,
            goal
        });
    } catch (error) {
        console.error('Get goal by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching the goal'
        });
    }
};

/**
 * Create a new goal
 * POST /api/goals
 * Requires authentication
 * Input: { title, description, status, targetDate, notes }
 * Output: { success, message, goalId }
 */
const createGoal = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const { title, description, status, targetDate, notes } = req.body;
        
        // Validate required fields
        if (!title || title.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Goal title is required'
            });
        }
        
        // Validate title length
        if (title.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Goal title must not exceed 255 characters'
            });
        }
        
        // Validate description length if provided
        if (description && description.length > 65535) {
            return res.status(400).json({
                success: false,
                error: 'Description is too long'
            });
        }
        
        // Validate status if provided
        if (status && !isValidStatus(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Allowed: not started, in progress, completed'
            });
        }
        
        // Validate notes length if provided
        if (notes && notes.length > 65535) {
            return res.status(400).json({
                success: false,
                error: 'Notes are too long'
            });
        }
        
        const goalId = await goalModel.createGoal(accountId, {
            title: title.trim(),
            description: description ? description.trim() : null,
            status: status ? status.toLowerCase() : 'not started',
            targetDate: targetDate || null,
            notes: notes ? notes.trim() : null
        });
        
        res.status(201).json({
            success: true,
            message: 'Goal created successfully',
            goalId: goalId
        });
    } catch (error) {
        console.error('Create goal error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while creating the goal'
        });
    }
};

/**
 * Update an existing goal
 * PUT /api/goals/:id
 * Requires authentication
 * Input: { title, description, status, targetDate, notes } (all optional)
 * Output: { success, message }
 */
const updateGoal = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const goalId = req.params.id;
        const { title, description, status, targetDate, notes } = req.body;
        
        // Check if goal exists and belongs to user
        const existingGoal = await goalModel.getGoalById(goalId, accountId);
        if (!existingGoal) {
            return res.status(404).json({
                success: false,
                error: 'Goal not found'
            });
        }
        
        // Validate title length if provided
        if (title !== undefined && title.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Goal title must not exceed 255 characters'
            });
        }
        
        // Validate status if provided
        if (status && !isValidStatus(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Allowed: not started, in progress, completed'
            });
        }
        
        const updated = await goalModel.updateGoal(goalId, accountId, {
            title: title !== undefined ? title.trim() : undefined,
            description: description !== undefined ? (description ? description.trim() : null) : undefined,
            status: status !== undefined ? status.toLowerCase() : undefined,
            targetDate: targetDate !== undefined ? targetDate : undefined,
            notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined
        });
        
        if (!updated) {
            return res.status(404).json({
                success: false,
                error: 'Goal not found or no changes made'
            });
        }
        
        res.json({
            success: true,
            message: 'Goal updated successfully'
        });
    } catch (error) {
        console.error('Update goal error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while updating the goal'
        });
    }
};

/**
 * Delete a goal
 * DELETE /api/goals/:id
 * Requires authentication
 * Output: { success, message }
 */
const deleteGoal = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const goalId = req.params.id;
        
        const deleted = await goalModel.deleteGoal(goalId, accountId);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Goal not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Goal deleted successfully'
        });
    } catch (error) {
        console.error('Delete goal error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while deleting the goal'
        });
    }
};

module.exports = {
    getGoals,
    getGoalById,
    createGoal,
    updateGoal,
    deleteGoal
};
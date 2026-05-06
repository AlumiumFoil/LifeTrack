// controllers/careerController.js
// Handles career endpoints and formatting for career goals/resources

const careerModel = require('../models/careerModel');

/**
 * Parse a comma-separated tag string into an array
 * @param {string} tagsCsv - Comma-separated tag list
 * @returns {Array} Tag array
 */
const parseTagsCsv = (tagsCsv) => {
    if (!tagsCsv || !tagsCsv.trim()) {
        return [];
    }

    return tagsCsv
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
};

/**
 * Convert DB status strings into the title-cased labels used by the current frontend
 * @param {string} status - Raw DB status
 * @returns {string} Display-friendly status
 */
const formatCareerStatusForResponse = (status) => {
    const normalized = String(status || '').trim().toLowerCase();

    if (normalized === 'in progress') return 'In Progress';
    if (normalized === 'completed') return 'Completed';
    return 'Not Started';
};

/**
 * Convert request status text into the lowercase DB value
 * @param {string|undefined} status - Incoming status value
 * @returns {string|undefined} Normalized DB status
 */
const normalizeCareerStatusForDatabase = (status) => {
    if (status === undefined) {
        return undefined;
    }

    const normalized = String(status).trim().toLowerCase();

    if (normalized === 'in progress') return 'in progress';
    if (normalized === 'completed') return 'completed';
    return 'not started';
};

/**
 * Format one career goal row for API output
 * @param {object} goal - Raw career goal row
 * @returns {object} Formatted career goal
 */
const formatCareerGoal = (goal) => ({
    careerGoalId: goal.careerGoalId,
    accountId: goal.accountId,
    title: goal.title,
    description: goal.description,
    targetRole: goal.targetRole,
    status: formatCareerStatusForResponse(goal.status),
    category: 'career',
    targetDate: goal.targetDate,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt
});

/**
 * Format one career resource row for API output
 * @param {object} resource - Raw resource row
 * @returns {object} Formatted career resource
 */
const formatCareerResource = (resource) => ({
    resourceId: resource.resourceId,
    title: resource.title,
    description: resource.description,
    url: resource.url,
    imageUrl: resource.imageUrl,
    thumbnailUrl: resource.thumbnailUrl,
    contentType: resource.contentType,
    category: resource.category,
    type: resource.contentType,
    useCase: resource.useCase,
    skillArea: resource.skillArea,
    tags: parseTagsCsv(resource.tagsCsv)
});

/**
 * Validate YYYY-MM-DD date format
 * @param {string} value - Incoming date string
 * @returns {boolean} True when valid
 */
const isValidDateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * GET /api/career/resources
 * Return backend supported career resources
 * Output: { success, resources }
 */
const getCareerResources = async (req, res) => {
    try {
        const resources = await careerModel.getCareerResources();

        return res.json({
            success: true,
            resources: resources.map(formatCareerResource)
        });
    } catch (error) {
        console.error('Get career resources error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while fetching career resources'
        });
    }
};

/**
 * GET /api/career/goals
 * Return all career goals for the authenticated user
 * Output: { success, goals }
 */
const getCareerGoals = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const goals = await careerModel.getCareerGoalsByAccountId(accountId);

        return res.json({
            success: true,
            goals: goals.map(formatCareerGoal)
        });
    } catch (error) {
        console.error('Get career goals error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while fetching career goals'
        });
    }
};

/**
 * GET /api/career/goals/:id
 * Return one career goal for the authenticated user
 * Output: { success, goal }
 */
const getCareerGoalById = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const careerGoalId = Number(req.params.id);

        if (!Number.isInteger(careerGoalId) || careerGoalId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Career goal id must be a positive integer'
            });
        }

        const goal = await careerModel.getCareerGoalById(careerGoalId, accountId);

        if (!goal) {
            return res.status(404).json({
                success: false,
                error: 'Career goal not found'
            });
        }

        return res.json({
            success: true,
            goal: formatCareerGoal(goal)
        });
    } catch (error) {
        console.error('Get career goal by ID error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while fetching the career goal'
        });
    }
};

/**
 * POST /api/career/goals
 * Create a new career goal for the authenticated user
 * Input: { title, description, targetRole, status, targetDate }
 * Output: { success, message, careerGoalId }
 */
const createCareerGoal = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const { title, description, targetRole, status, targetDate } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Career goal title is required'
            });
        }

        if (title.trim().length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Career goal title must not exceed 255 characters'
            });
        }

        if (targetRole !== undefined && targetRole !== null && String(targetRole).trim().length > 150) {
            return res.status(400).json({
                success: false,
                error: 'targetRole must not exceed 150 characters'
            });
        }

        if (targetDate && !isValidDateString(String(targetDate).trim())) {
            return res.status(400).json({
                success: false,
                error: 'targetDate must use YYYY-MM-DD format'
            });
        }

        const careerGoalId = await careerModel.createCareerGoal(accountId, {
            title: title.trim(),
            description: description ? String(description).trim() : null,
            targetRole: targetRole ? String(targetRole).trim() : null,
            status: normalizeCareerStatusForDatabase(status),
            targetDate: targetDate ? String(targetDate).trim() : null
        });

        return res.status(201).json({
            success: true,
            message: 'Career goal created successfully',
            careerGoalId
        });
    } catch (error) {
        console.error('Create career goal error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while creating the career goal'
        });
    }
};

/**
 * PUT /api/career/goals/:id
 * Update an existing career goal for the authenticated user
 * Input: { title?, description?, targetRole?, status?, targetDate? }
 * Output: { success, message }
 */
const updateCareerGoal = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const careerGoalId = Number(req.params.id);
        const { title, description, targetRole, status, targetDate } = req.body;

        if (!Number.isInteger(careerGoalId) || careerGoalId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Career goal id must be a positive integer'
            });
        }

        if (
            title === undefined &&
            description === undefined &&
            targetRole === undefined &&
            status === undefined &&
            targetDate === undefined
        ) {
            return res.status(400).json({
                success: false,
                error: 'At least one field must be provided for update'
            });
        }

        const existingGoal = await careerModel.getCareerGoalById(careerGoalId, accountId);
        if (!existingGoal) {
            return res.status(404).json({
                success: false,
                error: 'Career goal not found'
            });
        }

        if (title !== undefined) {
            if (!String(title).trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Career goal title must not be empty'
                });
            }

            if (String(title).trim().length > 255) {
                return res.status(400).json({
                    success: false,
                    error: 'Career goal title must not exceed 255 characters'
                });
            }
        }

        if (targetRole !== undefined && targetRole !== null && String(targetRole).trim().length > 150) {
            return res.status(400).json({
                success: false,
                error: 'targetRole must not exceed 150 characters'
            });
        }

        if (targetDate !== undefined && targetDate !== null && String(targetDate).trim() !== '' && !isValidDateString(String(targetDate).trim())) {
            return res.status(400).json({
                success: false,
                error: 'targetDate must use YYYY-MM-DD format'
            });
        }

        await careerModel.updateCareerGoal(careerGoalId, accountId, {
            title: title !== undefined ? String(title).trim() : undefined,
            description: description !== undefined ? (description ? String(description).trim() : null) : undefined,
            targetRole: targetRole !== undefined ? (targetRole ? String(targetRole).trim() : null) : undefined,
            status: status !== undefined ? normalizeCareerStatusForDatabase(status) : undefined,
            targetDate: targetDate !== undefined ? (targetDate ? String(targetDate).trim() : null) : undefined
        });

        return res.json({
            success: true,
            message: 'Career goal updated successfully'
        });
    } catch (error) {
        console.error('Update career goal error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while updating the career goal'
        });
    }
};

/**
 * DELETE /api/career/goals/:id
 * Delete a career goal owned by the authenticated user
 * Output: { success, message }
 */
const deleteCareerGoal = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const careerGoalId = Number(req.params.id);

        if (!Number.isInteger(careerGoalId) || careerGoalId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Career goal id must be a positive integer'
            });
        }

        const deleted = await careerModel.deleteCareerGoal(careerGoalId, accountId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Career goal not found'
            });
        }

        return res.json({
            success: true,
            message: 'Career goal deleted successfully'
        });
    } catch (error) {
        console.error('Delete career goal error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while deleting the career goal'
        });
    }
};

module.exports = {
    getCareerResources,
    getCareerGoals,
    getCareerGoalById,
    createCareerGoal,
    updateCareerGoal,
    deleteCareerGoal
};
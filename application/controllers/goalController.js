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
 * Valid milestone status values
 */
const VALID_MILESTONE_STATUSES = ['not started', 'in progress', 'completed'];

/**
 * Helper: Validate milestone status
 * @param {string} status - Status to validate
 * @returns {boolean} True if valid
 */
const isValidMilestoneStatus = (status) => {
    return !status || VALID_MILESTONE_STATUSES.includes(status);
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

/**
 * Get all projects for authenticated user
 * Requires authentication
 * GET /api/goals/projects
 * Output: { success, projects }
 */
const getProjects = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const projects = await goalModel.getProjects(accountId);
        
        res.json({
            success: true,
            projects
        });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching projects'
        });
    }
};

/**
 * Get a single project by ID
 * Requires authentication
 * GET /api/goals/projects/:id
 * Output: { success, project }
 */
const getProjectById = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const projectId = req.params.id;
        
        const project = await goalModel.getProjectById(projectId, accountId);
        
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }
        
        res.json({
            success: true,
            project
        });
    } catch (error) {
        console.error('Get project by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching the project'
        });
    }
};

/**
 * Create a new project
 * Requires authentication
 * POST /api/goals/projects
 * Input: { title, description, groupMembers, memberRoles, gitUrl }
 * Output: { success, message, projectId }
 */
const createProject = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const { title, description, groupMembers, memberRoles, gitUrl } = req.body;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Project title is required'
            });
        }
        
        if (title.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Project title must not exceed 255 characters'
            });
        }
        
        const projectId = await goalModel.createProject(accountId, {
            title: title.trim(),
            description: description ? description.trim() : null,
            groupMembers: groupMembers || [],
            memberRoles: memberRoles || {},
            gitUrl: gitUrl || null
        });
        
        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            projectId: projectId
        });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while creating the project'
        });
    }
};

/**
 * Update an existing project
 * Requires authentication
 * PUT /api/goals/projects/:id
 * Input: { title, description, groupMembers, memberRoles, gitUrl, status }
 * Output: { success, message }
 */
const updateProject = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const projectId = req.params.id;
        const { title, description, groupMembers, memberRoles, gitUrl, status } = req.body;
        
        const existingProject = await goalModel.getProjectById(projectId, accountId);
        if (!existingProject) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }
        
        // Only allow 'active' and 'completed' status values via update
        const ALLOWED_STATUSES = ['active', 'completed'];
        if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}.`
            });
        }
        
        if (title !== undefined && title.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Project title must not exceed 255 characters'
            });
        }
        
        await goalModel.updateProject(projectId, accountId, {
            title: title !== undefined ? title.trim() : undefined,
            description: description !== undefined ? (description ? description.trim() : null) : undefined,
            groupMembers: groupMembers !== undefined ? groupMembers : undefined,
            memberRoles: memberRoles !== undefined ? memberRoles : undefined,
            gitUrl: gitUrl !== undefined ? gitUrl : undefined,
            status: status !== undefined ? status : undefined
        });
        
        res.json({
            success: true,
            message: 'Project updated successfully'
        });
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while updating the project'
        });
    }
};

/**
 * Delete a project (soft delete)
 * Requires authentication
 * DELETE /api/goals/projects/:id
 * Output: { success, message }
 */
const deleteProject = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const projectId = req.params.id;
        
        const deleted = await goalModel.deleteProject(projectId, accountId);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while deleting the project'
        });
    }
};

/**
 * Get all milestones for a project
 * Requires authentication
 * GET /api/goals/projects/:projectId/milestones
 * Output: { success, milestones }
 */
const getMilestonesByProject = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const projectId = req.params.projectId;
        
        const project = await goalModel.getProjectById(projectId, accountId);
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }
        
        const milestones = await goalModel.getMilestonesByProjectId(projectId, accountId);
        
        res.json({
            success: true,
            milestones
        });
    } catch (error) {
        console.error('Get milestones error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching milestones'
        });
    }
};

/**
 * Get all milestones for authenticated user across all projects
 * Requires authentication
 * GET /api/goals/milestones
 * Output: { success, milestones }
 */
const getAllMilestones = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const milestones = await goalModel.getAllMilestones(accountId);
        
        res.json({
            success: true,
            milestones
        });
    } catch (error) {
        console.error('Get all milestones error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching milestones'
        });
    }
};

/**
 * Create a new milestone
 * Requires authentication
 * POST /api/goals/projects/:projectId/milestones
 * Input: { title, description, dueDate, status, sortOrder }
 * Output: { success, message, milestoneId }
 */
const createMilestone = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const projectId = req.params.projectId;
        const { title, description, dueDate, status, sortOrder } = req.body;
        
        const project = await goalModel.getProjectById(projectId, accountId);
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }
        
        if (!title || title.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Milestone title is required'
            });
        }
        
        if (title.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Milestone title must not exceed 255 characters'
            });
        }
        
        if (status && !isValidMilestoneStatus(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Allowed: not started, in progress, completed'
            });
        }
        
        const milestoneId = await goalModel.createMilestone(accountId, {
            projectId: projectId,
            title: title.trim(),
            description: description ? description.trim() : null,
            dueDate: dueDate || null,
            status: status || 'not started',
            sortOrder: sortOrder || 0
        });
        
        res.status(201).json({
            success: true,
            message: 'Milestone created successfully',
            milestoneId: milestoneId
        });
    } catch (error) {
        console.error('Create milestone error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while creating the milestone'
        });
    }
};

/**
 * Update an existing milestone
 * Requires authentication
 * PUT /api/goals/milestones/:id
 * Input: { title, description, dueDate, status, sortOrder }
 * Output: { success, message }
 */
const updateMilestone = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const milestoneId = req.params.id;
        const { title, description, dueDate, status, sortOrder } = req.body;
        
        const existingMilestone = await goalModel.getMilestoneById(milestoneId, accountId);
        if (!existingMilestone) {
            return res.status(404).json({
                success: false,
                error: 'Milestone not found'
            });
        }
        
        if (title !== undefined && title.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Milestone title must not exceed 255 characters'
            });
        }
        
        if (status && !isValidMilestoneStatus(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Allowed: not started, in progress, completed'
            });
        }
        
        await goalModel.updateMilestone(milestoneId, accountId, {
            title: title !== undefined ? title.trim() : undefined,
            description: description !== undefined ? (description ? description.trim() : null) : undefined,
            dueDate: dueDate !== undefined ? dueDate : undefined,
            status: status !== undefined ? status : undefined,
            sortOrder: sortOrder !== undefined ? sortOrder : undefined
        });
        
        res.json({
            success: true,
            message: 'Milestone updated successfully'
        });
    } catch (error) {
        console.error('Update milestone error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while updating the milestone'
        });
    }
};

/**
 * Delete a milestone
 * Requires authentication
 * DELETE /api/goals/milestones/:id
 * Output: { success, message }
 */
const deleteMilestone = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const milestoneId = req.params.id;
        
        const deleted = await goalModel.deleteMilestone(milestoneId, accountId);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Milestone not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Milestone deleted successfully'
        });
    } catch (error) {
        console.error('Delete milestone error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while deleting the milestone'
        });
    }
};

/**
 * Get project and milestone statistics
 * Requires authentication
 * GET /api/goals/projects/stats
 * Output: { success, stats }
 */
const getProjectStats = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const stats = await goalModel.getProjectStats(accountId);
        
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Get project stats error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching statistics'
        });
    }
};

module.exports = {
    getGoals,
    getGoalById,
    createGoal,
    updateGoal,
    deleteGoal,

    // Project Planner
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,

    // Project Planner - Milestones + Stats
    getMilestonesByProject,
    getAllMilestones,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    getProjectStats,

    // Valid values for Project Planner
    VALID_MILESTONE_STATUSES
};
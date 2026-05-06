// models/goalModel.js
// Handles database operations for user goals

const pool = require('../config/db');

// Helper Function
/**
 * Format a date object to YYYY-MM-DD string
 * @param {Date|null} date - Date object or null
 * @returns {string|null} Formatted date string or null
 */
const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Returns YYYY-MM-DD
};

/**
 * Get all goals for a specific user
 * @param {number} accountId - User's account ID
 * @returns {Promise<Array>} Array of goal objects
 */
const getGoalsByUserId = async (accountId) => {
    const [goals] = await pool.query(
        `SELECT 
            goal_id AS id,
            account_id AS accountId,
            title,
            description,
            status,
            target_date AS targetDate,
            notes,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM goals
         WHERE account_id = ?
         ORDER BY target_date ASC, created_at DESC`,
        [accountId]
    );
    return goals.map(goal => ({
        ...goal,
        targetDate: formatDate(goal.targetDate),
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt
    }));
};

/**
 * Get a single goal by ID (verify ownership)
 * @param {number} goalId - Goal ID
 * @param {number} accountId - User's account ID
 * @returns {Promise<object|null>} Goal object or null
 */
const getGoalById = async (goalId, accountId) => {
    const [goals] = await pool.query(
        `SELECT 
            goal_id AS id,
            account_id AS accountId,
            title,
            description,
            status,
            target_date AS targetDate,
            notes,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM goals
         WHERE goal_id = ? AND account_id = ?`,
        [goalId, accountId]
    );
    
    if (goals.length === 0) return null;
    
    const goal = goals[0];
    return {
        ...goal,
        targetDate: formatDate(goal.targetDate),  // FIXED: added date formatting
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt
    };
};

/**
 * Create a new goal
 * @param {number} accountId - User's account ID
 * @param {object} goalData - Goal data (title, description, status, targetDate, notes)
 * @returns {Promise<number>} Inserted goal ID
 */
const createGoal = async (accountId, goalData) => {
    const { title, description, status, targetDate, notes } = goalData;
    
    const [result] = await pool.query(
        `INSERT INTO goals (
            account_id, 
            title, 
            description, 
            status, 
            target_date, 
            notes,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [accountId, title, description || null, status || 'not started', targetDate || null, notes || null]
    );
    return result.insertId;
};

/**
 * Update an existing goal
 * @param {number} goalId - Goal ID
 * @param {number} accountId - User's account ID
 * @param {object} goalData - Updated goal data
 * @returns {Promise<boolean>} True if updated
 */
const updateGoal = async (goalId, accountId, goalData) => {
    const { title, description, status, targetDate, notes } = goalData;
    
    // Build dynamic SET clause based on provided fields
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
    }
    if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
    }
    if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
    }
    if (targetDate !== undefined) {
        updates.push('target_date = ?');
        values.push(targetDate);
    }
    if (notes !== undefined) {
        updates.push('notes = ?');
        values.push(notes);
    }
    
    // Always update the updated_at timestamp
    updates.push('updated_at = NOW()');
    
    // Add WHERE clause values
    values.push(goalId, accountId);
    
    const [result] = await pool.query(
        `UPDATE goals SET ${updates.join(', ')} WHERE goal_id = ? AND account_id = ?`,
        values
    );
    return result.affectedRows > 0;
};

/**
 * Delete a goal
 * @param {number} goalId - Goal ID
 * @param {number} accountId - User's account ID
 * @returns {Promise<boolean>} True if deleted
 */
const deleteGoal = async (goalId, accountId) => {
    const [result] = await pool.query(
        `DELETE FROM goals WHERE goal_id = ? AND account_id = ?`,
        [goalId, accountId]
    );
    return result.affectedRows > 0;
};

/**
 * Get goal statistics for a user (total, in progress, completed)
 * @param {number} accountId - User's account ID
 * @returns {Promise<object>} Statistics object
 */
const getGoalStats = async (accountId) => {
    const [stats] = await pool.query(
        `SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'in progress' THEN 1 ELSE 0 END) AS inProgress,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
         FROM goals
         WHERE account_id = ?`,
        [accountId]
    );
    
    return {
        total: Number(stats[0].total) || 0,
        inProgress: Number(stats[0].inProgress) || 0,
        completed: Number(stats[0].completed) || 0
    };
};

/**
 * Get all projects for a user
 * @param {number} accountId - User's account ID
 * @returns {Promise<Array>} Array of project objects
 */
const getProjects = async (accountId) => {
    const [projects] = await pool.query(
        `SELECT 
            project_id AS id,
            account_id AS accountId,
            title,
            description,
            group_members AS groupMembers,
            member_roles AS memberRoles,
            git_url AS gitUrl,
            status,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM projects
         WHERE account_id = ? AND status != 'archived'
         ORDER BY created_at DESC`,
        [accountId]
    );
    
    return projects.map(project => ({
        ...project,
        groupMembers: project.groupMembers ? JSON.parse(project.groupMembers) : [],
        memberRoles: project.memberRoles ? JSON.parse(project.memberRoles) : {}
    }));
};

/**
 * Get a single project by ID
 * @param {number} projectId - Project ID
 * @param {number} accountId - User's account ID
 * @returns {Promise<object|null>} Project object or null
 */
const getProjectById = async (projectId, accountId) => {
    const [projects] = await pool.query(
        `SELECT 
            project_id AS id,
            account_id AS accountId,
            title,
            description,
            group_members AS groupMembers,
            member_roles AS memberRoles,
            git_url AS gitUrl,
            status,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM projects
         WHERE project_id = ? AND account_id = ? AND status != 'archived'`,
        [projectId, accountId]
    );
    
    if (projects.length === 0) return null;
    
    const project = projects[0];
    return {
        ...project,
        groupMembers: project.groupMembers ? JSON.parse(project.groupMembers) : [],
        memberRoles: project.memberRoles ? JSON.parse(project.memberRoles) : {}
    };
};

/**
 * Create a new project
 * @param {number} accountId - User's account ID
 * @param {object} data - Project data
 * @returns {Promise<number>} Inserted project ID
 */
const createProject = async (accountId, data) => {
    const { title, description, groupMembers, memberRoles, gitUrl } = data;
    
    const [result] = await pool.query(
        `INSERT INTO projects (
            account_id, title, description, group_members, member_roles, git_url, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [accountId, title, description || null, 
         groupMembers ? JSON.stringify(groupMembers) : null,
         memberRoles ? JSON.stringify(memberRoles) : null,
         gitUrl || null]
    );
    return result.insertId;
};

/**
 * Update an existing project
 * @param {number} projectId - Project ID
 * @param {number} accountId - User's account ID
 * @param {object} data - Updated project data
 * @returns {Promise<boolean>} True if updated
 */
const updateProject = async (projectId, accountId, data) => {
    const { title, description, groupMembers, memberRoles, gitUrl, status } = data;
    
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
    }
    if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
    }
    if (groupMembers !== undefined) {
        updates.push('group_members = ?');
        values.push(JSON.stringify(groupMembers));
    }
    if (memberRoles !== undefined) {
        updates.push('member_roles = ?');
        values.push(JSON.stringify(memberRoles));
    }
    if (gitUrl !== undefined) {
        updates.push('git_url = ?');
        values.push(gitUrl);
    }
    if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
    }
    
    updates.push('updated_at = NOW()');
    values.push(projectId, accountId);
    
    const [result] = await pool.query(
        `UPDATE projects SET ${updates.join(', ')} WHERE project_id = ? AND account_id = ?`,
        values
    );
    return result.affectedRows > 0;
};

/**
 * Delete a project (soft delete)
 * @param {number} projectId - Project ID
 * @param {number} accountId - User's account ID
 * @returns {Promise<boolean>} True if deleted
 */
const deleteProject = async (projectId, accountId) => {
    const [result] = await pool.query(
        `UPDATE projects SET status = 'archived', updated_at = NOW() 
         WHERE project_id = ? AND account_id = ? AND status != 'archived'`,
        [projectId, accountId]
    );
    return result.affectedRows > 0;
};

/**
 * Get all milestones for a project
 * @param {number} projectId - Project ID
 * @param {number} accountId - User's account ID
 * @returns {Promise<Array>} Array of milestone objects
 */
const getMilestonesByProjectId = async (projectId, accountId) => {
    const [milestones] = await pool.query(
        `SELECT 
            milestone_id AS id,
            project_id AS projectId,
            account_id AS accountId,
            title,
            description,
            due_date AS dueDate,
            status,
            sort_order AS sortOrder,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM milestones
         WHERE project_id = ? AND account_id = ?
         ORDER BY sort_order ASC, due_date ASC, created_at ASC`,
        [projectId, accountId]
    );
    
    return milestones.map(milestone => ({
        ...milestone,
        dueDate: milestone.dueDate ? milestone.dueDate.toISOString().split('T')[0] : null
    }));
};

/**
 * Get all milestones for a user (across all projects)
 * @param {number} accountId - User's account ID
 * @returns {Promise<Array>} Array of milestone objects
 */
const getAllMilestones = async (accountId) => {
    const [milestones] = await pool.query(
        `SELECT 
            m.milestone_id AS id,
            m.project_id AS projectId,
            p.title AS projectTitle,
            m.title,
            m.description,
            m.due_date AS dueDate,
            m.status,
            m.sort_order AS sortOrder,
            m.created_at AS createdAt,
            m.updated_at AS updatedAt
         FROM milestones m
         JOIN projects p ON m.project_id = p.project_id
         WHERE m.account_id = ? AND p.status = 'active'
         ORDER BY m.due_date ASC, m.sort_order ASC`,
        [accountId]
    );
    
    return milestones.map(milestone => ({
        ...milestone,
        dueDate: milestone.dueDate ? milestone.dueDate.toISOString().split('T')[0] : null
    }));
};

/**
 * Get a single milestone by ID
 * @param {number} milestoneId - Milestone ID
 * @param {number} accountId - User's account ID
 * @returns {Promise<object|null>} Milestone object or null
 */
const getMilestoneById = async (milestoneId, accountId) => {
    const [milestones] = await pool.query(
        `SELECT 
            milestone_id AS id,
            project_id AS projectId,
            account_id AS accountId,
            title,
            description,
            due_date AS dueDate,
            status,
            sort_order AS sortOrder,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM milestones
         WHERE milestone_id = ? AND account_id = ?`,
        [milestoneId, accountId]
    );
    
    if (milestones.length === 0) return null;
    
    const milestone = milestones[0];
    return {
        ...milestone,
        dueDate: milestone.dueDate ? milestone.dueDate.toISOString().split('T')[0] : null
    };
};

/**
 * Create a new milestone
 * @param {number} accountId - User's account ID
 * @param {object} data - Milestone data
 * @returns {Promise<number>} Inserted milestone ID
 */
const createMilestone = async (accountId, data) => {
    const { projectId, title, description, dueDate, status, sortOrder } = data;
    
    const [result] = await pool.query(
        `INSERT INTO milestones (
            project_id, account_id, title, description, due_date, status, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [projectId, accountId, title, description || null, dueDate || null, status || 'not started', sortOrder || 0]
    );
    return result.insertId;
};

/**
 * Update an existing milestone
 * @param {number} milestoneId - Milestone ID
 * @param {number} accountId - User's account ID
 * @param {object} data - Updated milestone data
 * @returns {Promise<boolean>} True if updated
 */
const updateMilestone = async (milestoneId, accountId, data) => {
    const { title, description, dueDate, status, sortOrder } = data;
    
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
    }
    if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
    }
    if (dueDate !== undefined) {
        updates.push('due_date = ?');
        values.push(dueDate);
    }
    if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
    }
    if (sortOrder !== undefined) {
        updates.push('sort_order = ?');
        values.push(sortOrder);
    }
    
    updates.push('updated_at = NOW()');
    values.push(milestoneId, accountId);
    
    const [result] = await pool.query(
        `UPDATE milestones SET ${updates.join(', ')} WHERE milestone_id = ? AND account_id = ?`,
        values
    );
    return result.affectedRows > 0;
};

/**
 * Delete a milestone
 * @param {number} milestoneId - Milestone ID
 * @param {number} accountId - User's account ID
 * @returns {Promise<boolean>} True if deleted
 */
const deleteMilestone = async (milestoneId, accountId) => {
    const [result] = await pool.query(
        `DELETE FROM milestones WHERE milestone_id = ? AND account_id = ?`,
        [milestoneId, accountId]
    );
    return result.affectedRows > 0;
};

/**
 * Get project and milestone statistics
 * @param {number} accountId - User's account ID
 * @returns {Promise<object>} Statistics object
 */
const getProjectStats = async (accountId) => {
    const [projectStats] = await pool.query(
        `SELECT 
            COUNT(*) AS totalProjects,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS activeProjects,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedProjects
         FROM projects
         WHERE account_id = ?`,
        [accountId]
    );
    
    const [milestoneStats] = await pool.query(
        `SELECT 
            COUNT(*) AS totalMilestones,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedMilestones,
            SUM(CASE WHEN due_date < CURDATE() AND status != 'completed' THEN 1 ELSE 0 END) AS overdueMilestones
         FROM milestones
         WHERE account_id = ?`,
        [accountId]
    );
    
    return {
        projects: {
            total: Number(projectStats[0].totalProjects) || 0,
            active: Number(projectStats[0].activeProjects) || 0,
            completed: Number(projectStats[0].completedProjects) || 0
        },
        milestones: {
            total: Number(milestoneStats[0].totalMilestones) || 0,
            completed: Number(milestoneStats[0].completedMilestones) || 0,
            overdue: Number(milestoneStats[0].overdueMilestones) || 0
        }
    };
};

module.exports = {
    getGoalsByUserId,
    getGoalById,
    createGoal,
    updateGoal,
    deleteGoal,
    getGoalStats,

    // Project Planner functions
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    getMilestonesByProjectId,
    getAllMilestones,
    getMilestoneById,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    getProjectStats
};
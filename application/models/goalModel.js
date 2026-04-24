// models/goalModel.js
// Handles database operations for user goals

const pool = require('../config/db');

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
    return goals;
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
    return goals.length > 0 ? goals[0] : null;
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

module.exports = {
    getGoalsByUserId,
    getGoalById,
    createGoal,
    updateGoal,
    deleteGoal,
    getGoalStats
};
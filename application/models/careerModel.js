// models/careerModel.js
// Handles all database operations for career goals and career resources

const pool = require('../config/db');

/**
 * Get public career resources
 * Currently this includes the Resume resource and excludes the static career resources
 * @returns {Promise<Array>} Career resource rows
 */
const getCareerResources = async () => {
    const [rows] = await pool.query(
        `SELECT
            r.resource_id AS resourceId,
            r.title,
            r.description,
            r.url,
            r.image_url AS imageUrl,
            r.thumbnail_url AS thumbnailUrl,
            r.content_type AS contentType,
            r.category,
            r.use_case AS useCase,
            r.skill_area AS skillArea,
            COALESCE(GROUP_CONCAT(rt.tag ORDER BY rt.tag SEPARATOR ','), '') AS tagsCsv
         FROM resources r
         LEFT JOIN resource_tags rt
            ON r.resource_id = rt.resource_id
         WHERE r.is_public = 1
           AND r.category = 'career'
           AND r.url IN ('resources/resume.html')
         GROUP BY
            r.resource_id,
            r.title,
            r.description,
            r.url,
            r.image_url,
            r.thumbnail_url,
            r.content_type,
            r.category,
            r.use_case,
            r.skill_area
         ORDER BY r.created_at DESC`
    );

    return rows;
};

/**
 * Get all career goals for the authenticated user
 * @param {number} accountId - Authenticated user's account ID
 * @returns {Promise<Array>} Career goals
 */
const getCareerGoalsByAccountId = async (accountId) => {
    const [rows] = await pool.query(
        `SELECT
            career_goal_id AS careerGoalId,
            account_id AS accountId,
            title,
            description,
            target_role AS targetRole,
            status,
            target_date AS targetDate,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM career_goals
         WHERE account_id = ?
         ORDER BY created_at DESC, career_goal_id DESC`,
        [accountId]
    );

    return rows;
};

/**
 * Get one specific career goal by ID for the authenticated user
 * @param {number} careerGoalId - Career goal ID
 * @param {number} accountId - Authenticated user's account ID
 * @returns {Promise<object|null>} Career goal or null
 */
const getCareerGoalById = async (careerGoalId, accountId) => {
    const [rows] = await pool.query(
        `SELECT
            career_goal_id AS careerGoalId,
            account_id AS accountId,
            title,
            description,
            target_role AS targetRole,
            status,
            target_date AS targetDate,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM career_goals
         WHERE career_goal_id = ? AND account_id = ?`,
        [careerGoalId, accountId]
    );

    return rows[0] || null;
};

/**
 * Create a new career goal
 * @param {number} accountId - Authenticated user's account ID
 * @param {object} goalData - Career goal data
 * @returns {Promise<number>} New career goal ID
 */
const createCareerGoal = async (accountId, goalData) => {
    const { title, description, targetRole, status, targetDate } = goalData;

    const [result] = await pool.query(
        `INSERT INTO career_goals (
            account_id,
            title,
            description,
            target_role,
            status,
            target_date,
            created_at,
            updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
            accountId,
            title,
            description || null,
            targetRole || null,
            status || 'not started',
            targetDate || null
        ]
    );

    return result.insertId;
};

/**
 * Update an existing career goal
 * @param {number} careerGoalId - Career goal ID
 * @param {number} accountId - Authenticated user's account ID
 * @param {object} goalData - Fields to update
 * @returns {Promise<boolean>} True when a row was updated
 */
const updateCareerGoal = async (careerGoalId, accountId, goalData) => {
    const updates = [];
    const values = [];

    if (goalData.title !== undefined) {
        updates.push('title = ?');
        values.push(goalData.title);
    }

    if (goalData.description !== undefined) {
        updates.push('description = ?');
        values.push(goalData.description);
    }

    if (goalData.targetRole !== undefined) {
        updates.push('target_role = ?');
        values.push(goalData.targetRole);
    }

    if (goalData.status !== undefined) {
        updates.push('status = ?');
        values.push(goalData.status);
    }

    if (goalData.targetDate !== undefined) {
        updates.push('target_date = ?');
        values.push(goalData.targetDate);
    }

    updates.push('updated_at = NOW()');
    values.push(careerGoalId, accountId);

    const [result] = await pool.query(
        `UPDATE career_goals
         SET ${updates.join(', ')}
         WHERE career_goal_id = ? AND account_id = ?`,
        values
    );

    return result.affectedRows > 0;
};

/**
 * Delete a career goal owned by the authenticated user
 * @param {number} careerGoalId - Career goal ID
 * @param {number} accountId - Authenticated user's account ID
 * @returns {Promise<boolean>} True when a row was deleted
 */
const deleteCareerGoal = async (careerGoalId, accountId) => {
    const [result] = await pool.query(
        `DELETE FROM career_goals
         WHERE career_goal_id = ? AND account_id = ?`,
        [careerGoalId, accountId]
    );

    return result.affectedRows > 0;
};

module.exports = {
    getCareerResources,
    getCareerGoalsByAccountId,
    getCareerGoalById,
    createCareerGoal,
    updateCareerGoal,
    deleteCareerGoal
};
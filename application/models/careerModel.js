// models/careerModel.js
// Database queries for the Career page
// Fetches career-category public resources and the authenticated user's career goals

const pool = require('../config/db');

/**
 * Get all public resources tagged with the 'Career' category
 * @returns {Promise<Array>} Array of career resource rows
 */
const getCareerResources = async () => {
    const [rows] = await pool.query(
        `SELECT
            resource_id AS id,
            title,
            COALESCE(description, '') AS description,
            url,
            image_url,
            content_type,
            category,
            created_at
         FROM resources
         WHERE is_public = 1
           AND category = 'Career'
         ORDER BY created_at DESC
         LIMIT 20`
    );
    return rows;
};

/**
 * Get the authenticated user's goals in the 'Career' category
 * @param {number} accountId - Authenticated user's account ID
 * @returns {Promise<Array>} Array of career goal rows
 */
const getCareerGoals = async (accountId) => {
    const [rows] = await pool.query(
        `SELECT
            goal_id AS id,
            title,
            COALESCE(description, '') AS description,
            status,
            target_date,
            category,
            created_at
         FROM goals
         WHERE account_id = ?
           AND category = 'Career'
         ORDER BY created_at DESC
         LIMIT 20`,
        [accountId]
    );
    return rows;
};

module.exports = {
    getCareerResources,
    getCareerGoals
};

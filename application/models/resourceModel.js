// models/resourceModel.js
// Handles resource module data
// Includes resume, wellness module, and sleep routine module queries

const pool = require('../config/db');

/**
 * Get one public resource row and its tags by relative URL
 * @param {string} relativeUrl - Resource URL stored in the resources table
 * @returns {Promise<object|null>} Resource row or null
 */
const getPublicResourceByUrl = async (relativeUrl) => {
    const [rows] = await pool.query(
        `SELECT
            r.resource_id AS resourceId,
            r.title,
            r.description,
            r.url,
            r.image_url AS imageUrl,
            r.thumbnail_url AS thumbnailUrl,
            r.media_path AS mediaPath,
            r.content_type AS contentType,
            r.category,
            r.use_case AS useCase,
            r.skill_area AS skillArea,
            COALESCE(GROUP_CONCAT(rt.tag ORDER BY rt.tag SEPARATOR ','), '') AS tagsCsv
         FROM resources r
         LEFT JOIN resource_tags rt
            ON r.resource_id = rt.resource_id
         WHERE r.is_public = 1 AND r.url = ?
         GROUP BY
            r.resource_id,
            r.title,
            r.description,
            r.url,
            r.image_url,
            r.thumbnail_url,
            r.media_path,
            r.content_type,
            r.category,
            r.use_case,
            r.skill_area`,
        [relativeUrl]
    );

    return rows[0] || null;
};

/**
 * Get basic user profile fields that can prefill the resume module
 * @param {number} accountId - Authenticated user's account ID
 * @returns {Promise<object|null>} Prefill data or null
 */
const getResumePrefillByAccountId = async (accountId) => {
    const [rows] = await pool.query(
        `SELECT
            account_id AS accountId,
            email,
            username,
            full_name AS fullName,
            university,
            major,
            academic_year AS academicYear
         FROM user_accounts
         WHERE account_id = ?`,
        [accountId]
    );

    return rows[0] || null;
};

/**
 * Get a short list of the user's newest career goals for resume suggestions
 * @param {number} accountId - Authenticated user's account ID
 * @returns {Promise<Array>} Career goal suggestions
 */
const getCareerGoalSuggestionsByAccountId = async (accountId) => {
    const [rows] = await pool.query(
        `SELECT
            career_goal_id AS careerGoalId,
            title,
            description,
            target_role AS targetRole,
            status,
            target_date AS targetDate,
            created_at AS createdAt
         FROM career_goals
         WHERE account_id = ?
         ORDER BY created_at DESC, career_goal_id DESC
         LIMIT 5`,
        [accountId]
    );

    return rows;
};

/**
 * Get sleep related habits for the authenticated user
 * Uses the habits table
 * @param {number} accountId - Authenticated user's account ID
 * @returns {Promise<Array>} Sleep habit rows
 */
const getSleepRoutineHabitsByAccountId = async (accountId) => {
    const [rows] = await pool.query(
        `SELECT
            habit_id AS habitId,
            account_id AS accountId,
            title,
            description,
            category,
            frequency,
            status,
            last_completed_date AS lastCompletedDate,
            streak_count AS streakCount,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM habits
         WHERE account_id = ?
           AND status = 'active'
           AND category = 'sleep-routine'
         ORDER BY created_at DESC, habit_id DESC`,
        [accountId]
    );

    return rows;
};

/**
 * Create a new sleep related habit for the authenticated user
 * @param {number} accountId - Authenticated user's account ID
 * @param {object} habitData - Habit data
 * @returns {Promise<number>} New habit ID
 */
const createSleepRoutineHabit = async (accountId, habitData) => {
    const { title, description, frequency } = habitData;

    const [result] = await pool.query(
        `INSERT INTO habits (
            account_id,
            title,
            description,
            category,
            frequency,
            status,
            created_at,
            updated_at,
            last_completed_date,
            streak_count
         )
         VALUES (?, ?, ?, 'sleep-routine', ?, 'active', NOW(), NOW(), NULL, 0)`,
        [accountId, title, description || null, frequency || 'daily']
    );

    return result.insertId;
};

module.exports = {
    getPublicResourceByUrl,
    getResumePrefillByAccountId,
    getCareerGoalSuggestionsByAccountId,
    getSleepRoutineHabitsByAccountId,
    createSleepRoutineHabit
};
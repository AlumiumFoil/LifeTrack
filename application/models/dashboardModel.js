// Database queries for the authenticated user's dashboard.
// This file reads profile, accessibility, goal, project, milestone, 
// wellness, and academic records from MySQL using parameterized queries.

const pool = require('../config/db');

/**
 * Get the current user's profile record and assigned roles
 * @param {number} accountId - Authenticated user's account id
 * @returns {Promise<object|null>} Profile row or null when not found
 */
const getUserProfile = async (accountId) => {
    const [rows] = await pool.query(
        `SELECT
            ua.account_id AS accountId,
            ua.email,
            ua.username,
            ua.account_status AS accountStatus,
            ua.created_at AS createdAt,
            ua.profile_image_url AS profileImageUrl,
            ua.profile_thumbnail_url AS profileThumbnailUrl,
            COALESCE(
                GROUP_CONCAT(DISTINCT r.role_name ORDER BY r.role_name SEPARATOR ','),
                ''
            ) AS roleNames
         FROM user_accounts ua
         LEFT JOIN user_roles ur ON ur.account_id = ua.account_id
         LEFT JOIN roles r ON r.role_id = ur.role_id
         WHERE ua.account_id = ?
         GROUP BY
            ua.account_id,
            ua.email,
            ua.username,
            ua.account_status,
            ua.created_at,
            ua.profile_image_url,
            ua.profile_thumbnail_url`,
        [accountId]
    );

    if (rows.length === 0) {
        return null;
    }

    const profile = rows[0];
    return {
        ...profile,
        roles: profile.roleNames ? profile.roleNames.split(',') : []
    };
};

/**
 * Get the current user's saved accessibility settings
 * @param {number} accountId - Authenticated user's account id
 * @returns {Promise<object|null>} Accessibility settings row or null
 */
const getAccessibilitySettings = async (accountId) => {
    const [rows] = await pool.query(
        `SELECT
            settings_id AS settingsId,
            account_id AS accountId,
            theme_mode AS themeMode,
            text_size AS textSize,
            high_contrast_enabled AS highContrastEnabled,
            font_choice AS fontChoice,
            color_blind_mode AS colorBlindMode
         FROM user_accessibility_settings
         WHERE account_id = ?`,
        [accountId]
    );

    return rows[0] || null;
};

/**
 * Get all goals that belong to the current user
 * @param {number} accountId - Authenticated user's account id
 * @returns {Promise<object[]>} Array of goal rows
 */
const getGoalsByAccountId = async (accountId) => {
    const [rows] = await pool.query(
        `SELECT
            goal_id AS goalId,
            account_id AS accountId,
            title,
            description,
            status,
            target_date AS targetDate,
            notes,
            category,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM goals
         WHERE account_id = ?
         ORDER BY updated_at DESC, created_at DESC, goal_id DESC`,
        [accountId]
    );

    return rows;
};

/**
 * Get all projects that belong to the current user
 * @param {number} accountId - Authenticated user's account id
 * @returns {Promise<object[]>} Array of project rows
 */
const getProjectsByAccountId = async (accountId) => {
    const [rows] = await pool.query(
        `SELECT
            project_id AS projectId,
            account_id AS accountId,
            title,
            description,
            status,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM projects
         WHERE account_id = ?
         ORDER BY updated_at DESC, created_at DESC, project_id DESC`,
        [accountId]
    );

    return rows;
};

/**
 * Get all milestones that belong to projects owned by the current user
 * @param {number} accountId - Authenticated user's account id
 * @returns {Promise<object[]>} Array of milestone rows
 */
const getMilestonesByAccountId = async (accountId) => {
    const [rows] = await pool.query(
        `SELECT
            m.milestone_id AS milestoneId,
            m.project_id AS projectId,
            m.title,
            m.description,
            m.status,
            m.due_date AS dueDate,
            m.sort_order AS sortOrder,
            m.created_at AS createdAt,
            m.updated_at AS updatedAt
         FROM milestones m
         INNER JOIN projects p ON p.project_id = m.project_id
         WHERE p.account_id = ?
         ORDER BY
            m.project_id ASC,
            COALESCE(m.sort_order, 999999) ASC,
            COALESCE(m.due_date, '9999-12-31') ASC,
            m.milestone_id ASC`,
        [accountId]
    );

    return rows;
};

/**
 * Get course rows for the current user
 * @param {number} accountId - Authenticated user's account id
 * @returns {Promise<object[]>} Array of course rows
 */
const getCoursesByAccountId = async (accountId) => {
    const [rows] = await pool.query(
        `SELECT
            course_id AS courseId,
            account_id AS accountId,
            course_title AS courseTitle,
            course_code AS courseCode,
            current_grade AS currentGrade,
            instructor_name AS instructorName,
            term,
            updated_at AS updatedAt
         FROM courses
         WHERE account_id = ?
         ORDER BY course_code ASC, course_id DESC`,
        [accountId]
    );

    return rows;
};

/**
 * Get recent wellness mood entries for the current user
 * @param {number} accountId - Authenticated user's account id
 * @returns {Promise<object[]>} Array of wellness rows
 */
const getWellnessEntriesByAccountId = async (accountId) => {
    const [rows] = await pool.query(
        `SELECT
            entry_id AS entryId,
            account_id AS accountId,
            mood_value AS moodValue,
            note,
            created_at AS createdAt
         FROM wellness_mood_entries
         WHERE account_id = ?
         ORDER BY created_at DESC, entry_id DESC
         LIMIT 30`,
        [accountId]
    );

    return rows;
};

module.exports = {
    getUserProfile,
    getAccessibilitySettings,
    getGoalsByAccountId,
    getProjectsByAccountId,
    getMilestonesByAccountId,
    getCoursesByAccountId,
    getWellnessEntriesByAccountId
};
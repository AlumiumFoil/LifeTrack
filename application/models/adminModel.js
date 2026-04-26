// models/adminModel.js
// Admin-related database operations for Milestone 5
// Handles admin stats, admin user list, single user details, and role checks

const pool = require('../config/db');

/**
 * Get high-level admin stats for the dashboard
 * Includes total users, active users, total goals, total projects,
 * and average goals per user
 * @returns {Promise<object>} Admin stats object
 */
const getAdminStats = async () => {
    const [rows] = await pool.query(
        `SELECT
             (SELECT COUNT(*) FROM user_accounts) AS totalUsers,
             (SELECT COUNT(*) FROM user_accounts WHERE account_status = 'active') AS activeUsers,
             (SELECT COUNT(*) FROM goals) AS totalGoals,
             (SELECT COUNT(*) FROM projects) AS totalProjects`
    );

    const stats = rows[0] || {
        totalUsers: 0,
        activeUsers: 0,
        totalGoals: 0,
        totalProjects: 0
    };

    const totalUsers = Number(stats.totalUsers || 0);
    const totalGoals = Number(stats.totalGoals || 0);

    return {
        totalUsers,
        activeUsers: Number(stats.activeUsers || 0),
        totalGoals,
        totalProjects: Number(stats.totalProjects || 0),
        averageGoalsPerUser:
            totalUsers > 0 ? Number((totalGoals / totalUsers).toFixed(2)) : 0
    };
};

/**
 * Get all users for the admin user list page
 * Supports filters for name, email, registration date, and status
 * Results are sorted by newest registration date first
 * @param {object} filters - Optional filters
 * @param {string} [filters.name] - Partial match for full name or username
 * @param {string} [filters.email] - Partial match for email
 * @param {string} [filters.registrationDate] - Exact DATE(created_at) in YYYY-MM-DD
 * @param {string} [filters.status] - Exact account status match
 * @returns {Promise<Array>} Filtered user rows
 */
const getAdminUsers = async (filters = {}) => {
    const whereClauses = [];
    const values = [];

    if (filters.name) {
        whereClauses.push('(ua.full_name LIKE ? OR ua.username LIKE ?)');
        values.push(`%${filters.name}%`, `%${filters.name}%`);
    }

    if (filters.email) {
        whereClauses.push('ua.email LIKE ?');
        values.push(`%${filters.email}%`);
    }

    if (filters.registrationDate) {
        whereClauses.push('DATE(ua.created_at) = ?');
        values.push(filters.registrationDate);
    }

    if (filters.status) {
        whereClauses.push('ua.account_status = ?');
        values.push(filters.status);
    }

    const whereSql =
        whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [rows] = await pool.query(
        `SELECT
             ua.account_id AS accountId,
             ua.email,
             ua.username,
             ua.full_name AS fullName,
             ua.account_status AS accountStatus,
             ua.created_at AS createdAt,
             ua.profile_thumbnail_url AS profileThumbnailUrl,
             COALESCE(
                 GROUP_CONCAT(DISTINCT r.role_name ORDER BY r.role_name SEPARATOR ','),
                 ''
             ) AS rolesCsv
         FROM user_accounts ua
         LEFT JOIN user_roles ur
             ON ua.account_id = ur.account_id
         LEFT JOIN roles r
             ON ur.role_id = r.role_id
         ${whereSql}
         GROUP BY
             ua.account_id,
             ua.email,
             ua.username,
             ua.full_name,
             ua.account_status,
             ua.created_at,
             ua.profile_thumbnail_url
         ORDER BY ua.created_at DESC`,
        values
    );

    return rows;
};

/**
 * Get full details for one specific user by account ID
 * Includes profile fields and all assigned roles
 * @param {number} accountId - Target user account ID
 * @returns {Promise<object|null>} User details or null if missing
 */
const getAdminUserById = async (accountId) => {
    const [rows] = await pool.query(
        `SELECT
             ua.account_id AS accountId,
             ua.email,
             ua.username,
             ua.full_name AS fullName,
             ua.account_status AS accountStatus,
             ua.created_at AS createdAt,
             ua.profile_image_url AS profileImageUrl,
             ua.profile_thumbnail_url AS profileThumbnailUrl,
             ua.university,
             ua.major,
             ua.academic_year AS academicYear,
             COALESCE(
                 GROUP_CONCAT(DISTINCT r.role_name ORDER BY r.role_name SEPARATOR ','),
                 ''
             ) AS rolesCsv
         FROM user_accounts ua
         LEFT JOIN user_roles ur
             ON ua.account_id = ur.account_id
         LEFT JOIN roles r
             ON ur.role_id = r.role_id
         WHERE ua.account_id = ?
         GROUP BY
             ua.account_id,
             ua.email,
             ua.username,
             ua.full_name,
             ua.account_status,
             ua.created_at,
             ua.profile_image_url,
             ua.profile_thumbnail_url,
             ua.university,
             ua.major,
             ua.academic_year`,
        [accountId]
    );

    return rows[0] || null;
};

/**
 * Get all role names assigned to one account
 * Used by admin authorization middleware
 * @param {number} accountId - Authenticated user's account ID
 * @returns {Promise<Array>} Array of role name strings
 */
const getRoleNamesByAccountId = async (accountId) => {
    const [rows] = await pool.query(
        `SELECT r.role_name
         FROM roles r
         JOIN user_roles ur
             ON r.role_id = ur.role_id
         WHERE ur.account_id = ?`,
        [accountId]
    );

    return rows.map((row) => row.role_name);
};

module.exports = {
    getAdminStats,
    getAdminUsers,
    getAdminUserById,
    getRoleNamesByAccountId
};
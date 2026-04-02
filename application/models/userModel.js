// models/userModel.js
// User-related database operations

const pool = require('../config/db');

/**
 * Find a user by email or username
 * Used for login auth and account lookup
 * @param {string} identifier - Email or username
 * @returns {Promise<Array>} Array of user records
 */
const findUserByIdentifier = async (identifier) => {
    const [users] = await pool.query(
        `SELECT account_id, email, username, password_hash, account_status 
         FROM user_accounts 
         WHERE (email = ? OR username = ?) AND account_status = 'active'`,
        [identifier.toLowerCase(), identifier] // Emails are normalized to lowercase
    );
    return users;
};

/**
 * Find a user by ID
 * Validates user existence after token verification
 * @param {number} accountId - User's account ID
 * @returns {Promise<Array>} Array of user records
 */
const findUserById = async (accountId) => {
    const [users] = await pool.query(
        `SELECT account_id, email, username, account_status 
         FROM user_accounts 
         WHERE account_id = ? AND account_status = 'active'`,
        [accountId]
    );
    return users;
};

/**
 * Check if email already exists
 * Prevents usage of duplicate emails during registration due to case insensitivity
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if exists
 */
const emailExists = async (email) => {
    const [existing] = await pool.query(
        `SELECT account_id FROM user_accounts WHERE email = ?`,
        [email.toLowerCase()] // Normalize to lowercase
    );
    return existing.length > 0;
};

/**
 * Check if username already exists
 * Prevents duplicate usernames in the database during registration
 * @param {string} username - Username to check
 * @returns {Promise<boolean>} True if exists
 */
const usernameExists = async (username) => {
    const [existing] = await pool.query(
        `SELECT account_id FROM user_accounts WHERE username = ?`,
        [username]
    );
    return existing.length > 0;
};

/**
 * Create a new user account
 * @param {string} email - User's email
 * @param {string} username - User's username
 * @param {string} passwordHash - Hashed password
 * @returns {Promise<number>} Inserted account ID
 */
const createUser = async (email, username, passwordHash) => {
    const [result] = await pool.query(
        `INSERT INTO user_accounts (email, username, password_hash, account_status, created_at)
         VALUES (?, ?, ?, 'active', NOW())`,
        [email.toLowerCase(), username, passwordHash]
    );
    return result.insertId;
};


/**
 * Get role_id by role_name
 * @param {string} roleName - Name of the role (EX: 'college_student')
 * @returns {Promise<number|null>} Role ID or null if not found
 */
const getRoleIdByName = async (roleName) => {
    const [roles] = await pool.query(
        `SELECT role_id FROM roles WHERE role_name = ?`,
        [roleName]
    );
    return roles.length > 0 ? roles[0].role_id : null;
};

/**
 * Assign a role to a user
 * @param {number} accountId - User's account ID
 * @param {number} roleId - Role ID to assign
 * @returns {Promise<void>}
 */
const assignRoleToUser = async (accountId, roleId) => {
    await pool.query(
        `INSERT INTO user_roles (account_id, role_id) VALUES (?, ?)`,
        [accountId, roleId]
    );
};

/**
 * Get all roles for a user
 * @param {number} accountId - User's account ID
 * @returns {Promise<Array>} Array of role objects with role_id and role_name
 */
const getUserRoles = async (accountId) => {
    const [roles] = await pool.query(
        `SELECT r.role_id, r.role_name
         FROM roles r
         JOIN user_roles ur ON r.role_id = ur.role_id
         WHERE ur.account_id = ?`,
        [accountId]
    );
    return roles;
};

/**
 * Insert security questions for a user
 * Stores hashed answers for password recovery
 * @param {number} accountId - User's account ID
 * @param {Array} securityQuestions - Array of { question_text, answer_hash }
 * @param {object} connection - Database connection for transaction support
 * @returns {Promise<void>}
 */
const insertSecurityQuestions = async (accountId, securityQuestions, connection) => {
    for (const sq of securityQuestions) {
        await connection.query(
            `INSERT INTO user_security_questions (account_id, question_text, answer_hash, created_at)
             VALUES (?, ?, ?, NOW())`,
            [accountId, sq.question_text, sq.answer_hash]
        );
    }
};

/**
 * Initialize default user preference settings(system theme, normal text, no high contrast)
 * @param {number} accountId - User's account ID
 * @param {object} connection - Database connection for transaction support
 * @returns {Promise<void>}
 */
const createDefaultAccessibilitySettings = async (accountId, connection) => {
    await connection.query(
        `INSERT INTO user_accessibility_settings (account_id, theme_mode, text_size, high_contrast_enabled, font_choice, color_blind_mode)
         VALUES (?, 'system', 'normal', 0, NULL, NULL)`,
        [accountId]
    );
};

/**
 * Create default dashboard for a user
 * @param {number} accountId - User's account ID
 * @param {object} connection - Database connection for transaction support
 * @returns {Promise<void>}
 */
const createDefaultDashboard = async (accountId, connection) => {
    await connection.query(
        `INSERT INTO dashboards (account_id) VALUES (?)`,
        [accountId]
    );
};

// Exports
module.exports = {
    // User account functions
    findUserByIdentifier,
    findUserById,
    emailExists,
    usernameExists,
    createUser,
    
    // User role functions
    getRoleIdByName,
    assignRoleToUser,
    getUserRoles,
    
    // Security questions
    insertSecurityQuestions,
    
    // Accessibility settings
    createDefaultAccessibilitySettings,
    
    // Dashboard
    createDefaultDashboard
};
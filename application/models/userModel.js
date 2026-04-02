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

module.exports = {
    findUserByIdentifier,
    findUserById,
    emailExists,
    usernameExists,
    createUser
};
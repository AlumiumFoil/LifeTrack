// Database queries for profile image upload and retrieval
// This file updates the user's saved image and thumbnail URL

const pool = require('../config/db');

/**
 * Get the current profile image URLs for a user
 * @param {number} accountId - Authenticated user's account id
 * @returns {Promise<object|null>} Current image URLs or null if missing
 */
const getProfileImageUrlsByAccountId = async (accountId) => {
    const [rows] = await pool.query(
        `SELECT
            account_id AS accountId,
            profile_image_url AS profileImageUrl,
            profile_thumbnail_url AS profileThumbnailUrl
         FROM user_accounts
         WHERE account_id = ?`,
        [accountId]
    );

    return rows[0] || null;
};

/**
 * Save the new image URLs for a user after upload succeeds
 * @param {number} accountId - Authenticated user's account id
 * @param {string} profileImageUrl - Public URL for the original image
 * @param {string} profileThumbnailUrl - Public URL for the generated thumbnail
 * @returns {Promise<void>} Resolves when update succeeds
 */
const updateProfileImageUrls = async (
    accountId,
    profileImageUrl,
    profileThumbnailUrl
) => {
    await pool.query(
        `UPDATE user_accounts
         SET profile_image_url = ?,
             profile_thumbnail_url = ?
         WHERE account_id = ?`,
        [profileImageUrl, profileThumbnailUrl, accountId]
    );
};

module.exports = {
    getProfileImageUrlsByAccountId,
    updateProfileImageUrls
};
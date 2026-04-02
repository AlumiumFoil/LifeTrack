// models/searchModel.js
// Search-related database operations
// Handles searching public resources with optional filters

const pool = require('../config/db');

/**
 * Search public resources with optional filters
 * Uses parameterized queries for SQL injection prevention
 * @param {string} searchTerm - Optional search term for title/description matching
 * @param {string} category - Optional category filter
 * @param {string} contentType - Optional content type filter
 * @returns {Promise<Array>} Array of resource objects matching criteria
 */
const searchPublicResources = async (searchTerm, category, contentType) => {
    // Base query that only looks at publicly available resources
    let sql = `
        SELECT
            resource_id,
            title,
            description,
            url,
            image_url,
            content_type,
            category
        FROM resources
        WHERE is_public = 1
    `;

    const params = [];

    // Add keyword search filter if provided
    // Uses LIKE with wildcards for partial matching
    if (searchTerm && searchTerm.trim()) {
        const likeTerm = `%${searchTerm.trim()}%`;
        sql += ` AND (title LIKE ? OR description LIKE ?)`;
        params.push(likeTerm, likeTerm);
    }

    // Add category filter if provided (exact match)
    if (category && category.trim()) {
        sql += ` AND category = ?`;
        params.push(category.trim());
    }

    // Add content type filter if provided (exact match)
    if (contentType && contentType.trim()) {
        sql += ` AND content_type = ?`;
        params.push(contentType.trim());
    }

    // Order by newest first, limit to 50 results for performance
    sql += ` ORDER BY created_at DESC LIMIT 50`;

    const [results] = await pool.query(sql, params);
    return results;
};

module.exports = {
    searchPublicResources
};
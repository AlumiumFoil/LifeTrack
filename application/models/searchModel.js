// models/searchModel.js
// Search-related database operations
// Handles searching public resources with optional filters

const pool = require('../config/db');

/**
 * Search public resources with optional filters
 * Uses parameterized queries for SQL injection prevention
 * @param {string} searchTerm - Search term
 * @param {string} category - Optional category filter
 * @param {string} contentType - Optional content type filter
 * @returns {Promise<Array>} Array of resource objects matching criteria
 */
const searchPublicResources = async (searchTerm, category, contentType) => {
    // Base query that only looks at publicly available resources
    let sql = `
        SELECT
            'resource' as source,
            resource_id as id,
            title,
            COALESCE(description, '') as description,
            NULL as status,
            NULL as target_date,
            NULL as due_date,
            url,
            image_url,
            content_type,
            category,
            created_at as item_created_at
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

    return { sql, params };
};

/**
 * Search user-specific content (goals, projects, milestones)
 * Only returns content belonging to the user
 * @param {number} accountId - User's account ID
 * @param {string} searchTerm - Search term
 * @returns {Promise<Object>} SQL query and parameters for user content
 */
const searchUserContent = async (accountId, searchTerm) => {
    let sql = '';
    const params = [accountId];

    // Search for goals
    sql += `
        SELECT 
            'goal' as source,
            goal_id as id,
            title,
            COALESCE(description, '') as description,
            status,
            target_date,
            NULL as due_date,
            NULL as url,
            NULL as image_url,
            NULL as content_type,
            category,
            created_at as item_created_at
        FROM goals
        WHERE account_id = ?
    `;
    params.push(accountId);

    if (searchTerm && searchTerm.trim()) {
        const likeTerm = `%${searchTerm.trim()}%`;
        sql += ` AND (title LIKE ? OR COALESCE(description, '') LIKE ?)`;
        params.push(likeTerm, likeTerm);
    }

    // Search for projects
    sql += `
        UNION ALL
        SELECT 
            'project' as source,
            project_id as id,
            title,
            COALESCE(description, '') as description,
            status,
            NULL as target_date,
            NULL as due_date,
            NULL as url,
            NULL as image_url,
            NULL as content_type,
            NULL as category,
            created_at as item_created_at
        FROM projects
        WHERE account_id = ?
    `;
    params.push(accountId);

    if (searchTerm && searchTerm.trim()) {
        const likeTerm = `%${searchTerm.trim()}%`;
        sql += ` AND (title LIKE ? OR COALESCE(description, '') LIKE ?)`;
        params.push(likeTerm, likeTerm);
    }

    // Search for milestones
    // Milestones are linked to projects, so we join to filter by account_id by checking the project_id
    sql += `
        UNION ALL
        SELECT 
            'milestone' as source,
            milestone_id as id,
            m.title,
            COALESCE(m.description, '') as description,
            m.status,
            NULL as target_date,
            m.due_date,
            NULL as url,
            NULL as image_url,
            NULL as content_type,
            NULL as category,
            m.created_at as item_created_at
        FROM milestones m
        JOIN projects p ON m.project_id = p.project_id
        WHERE p.account_id = ?
    `;
    params.push(accountId);

    if (searchTerm && searchTerm.trim()) {
        const likeTerm = `%${searchTerm.trim()}%`;
        sql += ` AND (m.title LIKE ? OR COALESCE(m.description, '') LIKE ?)`;
        params.push(likeTerm, likeTerm);
    }

    return { sql, params };
};

/**
 * Combined search across public and user-specific content
 * @param {string} searchTerm - Search term
 * @param {string} category - Optional category filter
 * @param {string} contentType - Optional content type filter
 * @param {number|null} accountId - User's account ID
 * @returns {Promise<Array>} Combined search results
 */
const executeSearch = async (searchTerm, category, contentType, accountId) => {
    try {
        // Get query for public resources
        const { sql: resourceSql, params: resourceParams } = await searchPublicResources(searchTerm, category, contentType);
    
        let finalSql = resourceSql;
        let finalParams = [...resourceParams];

        // Add user-specific content to search results if authenticated
        if (accountId) {
            const { sql: userSql, params: userParams } = await searchUserContent(accountId, searchTerm);
            finalSql += ` UNION ALL ${userSql}`;
            finalParams.push(...userParams);
        }

        // Order by newest first, limited to 50 results
        finalSql += ` ORDER BY item_created_at DESC LIMIT 50`;

        const [results] = await pool.query(finalSql, finalParams);
        return results;
    } catch (error) {
        console.error('Search SQL Error:', error.message);
        console.error('Full error:', error);
        throw error;
    }
};

// Exports
module.exports = {
    searchPublicResources,
    searchUserContent,
    executeSearch
};
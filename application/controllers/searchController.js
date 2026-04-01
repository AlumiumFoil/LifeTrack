// controllers/searchController.js
// Handles resource search logic
// Provides search functionality for public resources

const searchModel = require('../models/searchModel');

/**
 * Search for public resources
 * GET /api/resources/search
 * Query Parameters:
 *   - q: Search term (optional) - searches title and description
 *   - category: Filter by category (optional)
 *   - content_type: Filter by content type (optional)
 * Output: { success, results, total }
 */
const searchResources = async (req, res) => {
    try {
        // Extract and sanitize query parameters
        const q = (req.query.q || '').trim();
        const category = (req.query.category || '').trim();
        const contentType = (req.query.content_type || '').trim();

        // Execute search
        const results = await searchModel.searchPublicResources(q, category, contentType);

        res.json({
            success: true,
            results,
            total: results.length,
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            results: [],
            total: 0,
            error: 'An error occurred while searching',
        });
    }
};

// Exports
module.exports = {
    searchResources
};
// controllers/searchController.js
// Handles resource search logic
// Provides search functionality for public resources and user content

const searchModel = require('../models/searchModel');

// Helper functions
/**
 * Validate search input
 * Only allows letters, numbers, spaces, and hyphens
 * Maximum length of 40 characters
 * @param {string} input - Search input
 * @returns {boolean} True if input is valid
 */
const isValidSearchInput = (input) => {
    if (!input) return true; // Empty input is valid
    
    // Maximum 40 characters for search length
    if (input.length > 40) return false;
    
    // Allow letters (a-z, A-Z), numbers (0-9), spaces, and hyphens for search queries
    const validPattern = /^[a-zA-Z0-9\s\-]+$/;
    return validPattern.test(input);
};

/**
 * Sanitize search input by trimming and limiting length
 * @param {string} input - Raw search input
 * @returns {string} Sanitized input
 */
const sanitizeSearchInput = (input) => {
    if (!input) return '';
    // Trim whitespace and limit to 40 characters
    return input.trim().slice(0, 40);
};

/**
 * Get authenticated user's account ID
 * @param {object} req - Request object
 * @returns {number|null} Account ID or null if not authenticated
 */
const getAuthenticatedUserId = (req) => {
    // If user is attached via middleware (from JWT token)
    if (req.user && req.user.account_id) {
        return req.user.account_id;
    }
    return null;
};

/**
 * Search for public resources and user content
 * GET /api/resources/search
 * Query Parameters:
 *   - q: Search term - searches title and description
 *   - category: Filter by category (optional, resources only)
 *   - content_type: Filter by content type (optional, resources only)
 * Output: { success, results, total, isAuthenticated, searchParams }
 */
const searchResources = async (req, res) => {
    try {
        // Extract and sanitize query parameters
        let q = (req.query.q || '').trim();
        let category = (req.query.category || '').trim();
        let contentType = (req.query.content_type || '').trim();

        // Input validation
        const validationErrors = [];

        if (q && !isValidSearchInput(q)) {
            validationErrors.push('Search term must contain only letters, numbers, spaces, and hyphens (max 40 characters)');
        }
        if (category && !isValidSearchInput(category)) {
            validationErrors.push('Category must contain only letters, numbers, spaces, and hyphens (max 40 characters)');
        }
        if (contentType && !isValidSearchInput(contentType)) {
            validationErrors.push('Content type must contain only letters, numbers, spaces, and hyphens (max 40 characters)');
        }
        
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                errors: validationErrors,
                searchParams: { q, category, content_type: contentType }
            });
        }

        q = sanitizeSearchInput(q);
        category = sanitizeSearchInput(category);
        contentType = sanitizeSearchInput(contentType);
        
        // Check if user is authenticated (user attached via JWT middleware)
        const accountId = getAuthenticatedUserId(req);
        const isAuthenticated = accountId !== null;

        // Execute search
        const results = await searchModel.executeSearch(q, category, contentType, accountId);

        res.json({
            success: true,
            results,
            total: results.length,
            isAuthenticated: isAuthenticated,
            searchParams: {
                q: q || null,
                category: category || null,
                content_type: contentType || null
            }
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            results: [],
            total: 0,
            error: 'An error occurred while searching',
            searchParams: { q: null, category: null, content_type: null }
        });
    }
};

// Exports
module.exports = {
    searchResources,
    isValidSearchInput,
    sanitizeSearchInput
};
// routes/searchRoutes.js
// Defines all search-related API routes
// Routes are prefixed with /api/resources

const express = require('express');
const searchController = require('../controllers/searchController');

const router = express.Router();


// Public Search Routes - No authentication required
/**
 * GET /api/resources/search
 * Search for public resources
 * Query Parameters:
 *   - q: Search term (optional)
 *   - category: Category filter (optional)
 *   - content_type: Content type filter (optional)
 * Output: { success, results, total }
 */
router.get('/search', searchController.searchResources);

// Exports
module.exports = router;
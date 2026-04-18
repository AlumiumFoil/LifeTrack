// routes/searchRoutes.js
// Defines all search-related API routes
// Routes are prefixed with /api/resources

const express = require('express');
const searchController = require('../controllers/searchController');
const { optionalAuthenticateJWT } = require('../middleware/authenticate'); // Allow guests to use search function for public resources only

const router = express.Router();


// Public Search Routes - Authentication is optional. Guests can search for only public resources, users will be able to search for user content
/**
 * GET /api/resources/search
 * Search for public resources and user content (if authenticated)
 * Query Parameters:
 *   - q: Search term (optional)
 *   - category: Category filter (optional)
 *   - content_type: Content type filter (optional)
 * 
 * For authenticated users, results also include:
 *   - Personal goals (matching title/description)
 *   - Personal projects (matching title/description)
 *   - Personal milestones (matching title/description)
 * Output: { 
 *   success, 
 *   results[], 
 *   total, 
 *   isAuthenticated, 
 *   searchParams: { q, category, content_type} 
 * }
 */
router.get('/search', optionalAuthenticateJWT, searchController.searchResources);

// Exports
module.exports = router;
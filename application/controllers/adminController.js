// controllers/adminController.js
// Handles admin endpoints
// Includes admin stats, admin user list, and single admin user detail endpoints

const adminModel = require('../models/adminModel');

/**
 * Convert a comma separated role string into an array
 * @param {string} rolesCsv - comma separated role names
 * @returns {Array} Array of role names
 */
const parseRolesCsv = (rolesCsv) => {
    if(!rolesCsv || !rolesCsv.trim()){
        return[];
    }
    return rolesCsv
        .split(',')
        .map((role) => role.trim())
        .filter(Boolean);
};

/**
 * GET /api/admin/stats
 * Return summary admin stats as JSON
 * Requires authenticated administrator access
 * @param {object} req
 * @param {object} res
 * @returns {Promise<void>}
 */
const getAdminStats = async (req, res) => {
    try {
        const stats = await adminModel.getAdminStats();
        return res.json({
            success: true,
            stats
        });
    } catch (error){
        console.error('Get admin stats error: ', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while fetching admin stats'
        });
    }
};

/**
 * GET /api/admin/users
 * Return all users, with option to filter by query parameters
 * Supported filters: name, email, registration date, status
 * Results are sorted by created_at descending
 * Requires authenticated administrator access
 * @param {object} req
 * @param {object} res
 * @returns {Promise<void>}
 */
const getAdminUsers = async (res,req) => {
    try {
        const name = typeof req.query.name === 'string' && req.query.name.trim()
        ? req.query.name.trim() : undefined;

        const email = typeof req.query.email === 'string' && req.query.email.trim()
        ? req.query.email.trim() : undefined;

        const status = typeof req.query.status === 'string' && req.query.status.trim()
        ? req.query.status.trim() : undefined;

        const rawRegistrationDate = typeof req.query.registrationDate === 'string' 
        ? req.query.registrationDate.trim()
        : typeof req.query.registration_date === 'string' ? req.query.registration_date.trim()
        : undefined;

        if(rawRegistrationDate && !/^\d{4}-\d{2}-\d{2}$/.test(rawRegistrationDate)) {
            return res.status(400).json({
                success: false,
                error: 'registrationDate must use YYYY-MM-DD format'
            });
        }
        
        const users = await adminModel.getAdminUsers({
            name,
            email,
            status,
            registrationDate: rawRegistrationDate
        });

        return res.json({
            success: true,
            users: users.map((user) => ({
                accountId: user.accountId,
                email: user.email,
                username: user.username,
                fullName: user.fullName,
                accountStatus: user.accountStatus,
                createdAt: user.createdAt,
                profileThumbnailUrl: user.profileThumbnailUrl,
                roles: parseRolesCsv(user.rolesCsv)
            }))
        });
    } catch (error){
        console.error('Get admin users error: ', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while fetching admin users'
        });
    }
};

/**
 * GET /api/admin/users/:id
 * Return full details for a specific user
 * Requires authenticated administrator access
 * Returns 404 if user does not exist
 * @param {object} req
 * @param {object} res
 * @returns {Promise<void>}
 */
const getAdminUserById = async (req,res) => {
    try {
        const accountId = Number(req.params.id);

        if(!Number.isInteger(accountId) || accountId <= 0){
            return res.status(400).json({
                success: false,
                error: 'User ID must be a positive integer'
            });
        }

        const user = await adminModel.getAdminUserById(accountId);

        if(!user){
            return res.status(400).json({
                success: false,
                error: 'Admin user view target not found'
            });
        }

        return res.json({
            success: true,
            user: {
                accountId: user.accountId,
                email: user.email,
                username: user.username,
                fullName: user.fullName,
                accountStatus: user.accountStatus,
                createdAt: user.createdAt,
                profileImageUrl: user.profileImageUrl,
                profileThumbnailUrl: user.profileThumbnailUrl,
                university: user.university,
                major: user.major,
                academicYear: user.academicYear,
                roles: parseRolesCsv(user.rolesCsv)
            }
        });
    } catch (error){
        console.error('Get admin user details error: ', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while fetching admin user details'
        });
    }
};

module.exports = {
    getAdminStats,
    getAdminUsers,
    getAdminUserById
};
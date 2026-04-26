// middleware/authorize.js
// Aiuthorization middleware for role protected routes
// Milestone 5 admin routes require administrator access

const adminModel = require('../models/adminModel');

/**
 * Check whether the authenticated user has an administrator role
 * The database uses role_name = 'administrator', but 'admin' is accepted
 * @param {object} req 
 * @param {object} res
 * @param {Function} next
 * @returns {Promise<void>}
 */

const authorizeAdmin = async (req,res,next) => {
    try{
        if(!req.user || !req.user.account_id){
            return res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
        }
        const roleNames = await adminModel.getRoleNamesByAccountId(
            req.user.account_id
        );
        const allowedAdminRoleNames = new Set(['administrator','admin']);
        const isAdmin = roleNames.some((roleName) => allowedAdminRoleNames.has(
            String(roleName).toLowerCase()
        ));
        if(!isAdmin){
            return res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
        }
        req.user.roles = roleNames;
        return next();
    } catch (error){
        console.error('Admin authorization error', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred during authorization'
        });
    }
};
module.exports = {
    authorizeAdmin
};
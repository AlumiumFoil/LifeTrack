// controllers/userController.js
// Handles user-related endpoints
// Contains endpoints for user data that doesn't require authentication

/**
 * Get list of premade security questions
 * GET /api/users/security-questions
 * Used during account registration
 * Output: { success, questions }
 */
const getSecurityQuestions = async (req, res) => {
    try {
        const securityQuestions = [
            "What is the name of your first pet?",
            "What was your first car?",
            "What was your childhood nickname?",
            "What city were you born in?",
            "What elementary school did you attend?",
            "What is your favorite movie?",
            "What is your favorite book?",
            "What is your mother's maiden name?",
            "What is the name of your best friend from your childhood?",
            "What is your favorite food?",
            "What is your favorite color?",
            "What street did you grow up on?",
            "Who is your favorite musical artist?"
        ];

        res.json({
            success: true,
            questions: securityQuestions
        });
    } catch (error) {
        console.error('Error fetching security questions:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching security questions'
        });
    }
};

module.exports = {
    getSecurityQuestions
};
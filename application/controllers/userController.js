// controllers/userController.js
// Handles user-related endpoints
// Contains endpoints for user data that doesn't require authentication

const fs = require('fs/promises');
const path = require('path');
const pool = require('../config/db');
const sharp = require('sharp');
const dashboardModel = require('../models/dashboardModel');
const profileImageModel = require('../models/profileImageModel');
const userModel = require('../models/userModel');
const {
    verifyPassword,
    hashPassword
} = require('../middleware/authenticate');

/**
 * Build a public URL for a file served from the public directory
 * @param {object} req 
 * @param {string} relativePath 
 * @returns {string} public URL
 */
const buildPublicFileUrl = (req, relativePath) => {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    const publicBaseUrl =
        process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;

    return `${publicBaseUrl}/${normalizedPath}`;
};

/**
 * Delete a local file only when it points into this application's public folder
 * @param {string|null|undefined} fileUrl - Previously saved public file URL
 * @returns {Promise<void>} Resolves after delete attempt completes
 */
const deleteLocalUploadFromUrl = async (fileUrl) => {
    if (!fileUrl) {
        return;
    }

    try {
        const parsedUrl = new URL(fileUrl);
        const relativePath = decodeURIComponent(parsedUrl.pathname).replace(/^\//, '');
        const absolutePath = path.join(__dirname, '..', 'public', relativePath);
        const publicDirectory = path.join(__dirname, '..', 'public');

        if (!absolutePath.startsWith(publicDirectory)) {
            return;
        }

        await fs.unlink(absolutePath);
    } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'ERR_INVALID_URL') {
            console.warn('Could not delete previous profile image file:', error.message);
        }
    }
};

/**
 * Build summary numbers for the dashboard
 * @param {object[]} goals - User goal rows
 * @param {object[]} projects - User project rows
 * @param {object[]} milestones - User milestone rows
 * @param {object[]} academicProgress - User academic rows
 * @param {object[]} wellnessEntries - User wellness rows
 * @returns {object} Summary counts and averages
 */
const buildDashboardSummary = (
    goals,
    projects,
    milestones,
    academicProgress,
    wellnessEntries
) => {
    const completedGoals = goals.filter((goal) => goal.status === 'completed').length;
    const completedProjects = projects.filter(
        (project) => project.status === 'completed'
    ).length;
    const completedMilestones = milestones.filter(
        (milestone) => milestone.status === 'completed'
    ).length;

    const averageAcademicProgress = academicProgress.length
        ? Number(
              (
                  academicProgress.reduce(
                      (sum, item) => sum + Number(item.progressPercent || 0),
                      0
                  ) / academicProgress.length
              ).toFixed(2)
          )
        : null;

    const averageMoodValue = wellnessEntries.length
        ? Number(
              (
                  wellnessEntries.reduce(
                      (sum, item) => sum + Number(item.moodValue || 0),
                      0
                  ) / wellnessEntries.length
              ).toFixed(2)
          )
        : null;

    return {
        goalCount: goals.length,
        projectCount: projects.length,
        milestoneCount: milestones.length,
        academicCourseCount: academicProgress.length,
        wellnessEntryCount: wellnessEntries.length,
        completedGoals,
        completedProjects,
        completedMilestones,
        averageAcademicProgress,
        averageMoodValue
    };
};

/**
 * Nest milestones under each project
 * @param {object[]} projects - User project rows
 * @param {object[]} milestones - User milestone rows
 * @returns {object[]} Projects with milestones arrays attached
 */
const attachMilestonesToProjects = (projects, milestones) => {
    const milestonesByProjectId = new Map();

    for (const milestone of milestones) {
        if (!milestonesByProjectId.has(milestone.projectId)) {
            milestonesByProjectId.set(milestone.projectId, []);
        }

        milestonesByProjectId.get(milestone.projectId).push(milestone);
    }

    return projects.map((project) => ({
        ...project,
        milestones: milestonesByProjectId.get(project.projectId) || []
    }));
};

/**
 * Convert different input values into 1 or 0 for MySQL
 * Accepts booleans, numbers, and common string forms used by frontends
 * @param {boolean|number|string} value - Raw high contrast input
 * @returns {number|null} 1, 0, or null when invalid
 */
const normalizeHighContrastEnabled = (value) => {
    if (value === true || value === 1 || value === '1' || value === 'true') {
        return 1;
    }

    if (value === false || value === 0 || value === '0' || value === 'false') {
        return 0;
    }

    return null;
};

/**
 * Get or initialize the current user's accessibility settings
 * GET /api/users/me/accessibility
 * Requires authentication
 * Output: { success, accessibility }
 */
const getAccessibilitySettings = async (req, res) => {
    try {
        const accountId = req.user.account_id;

        await userModel.ensureAccessibilitySettingsExist(accountId);

        const accessibility = await userModel.getAccessibilitySettingsByAccountId(
            accountId
        );

        return res.json({
            success: true,
            accessibility
        });
    } catch (error) {
        console.error('Get accessibility settings error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while fetching accessibility settings.'
        });
    }
};

/**
 * Update the current user's accessibility settings
 * PUT /api/users/me/accessibility
 * Requires authentication
 * Input: { themeMode?, textSize?, highContrastEnabled? }
 * Output: { success, message, accessibility }
 */
const updateAccessibilitySettings = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const { themeMode, textSize, highContrastEnabled } = req.body;

        const allowedThemeModes = ['light', 'dark', 'system'];
        const allowedTextSizes = ['small', 'normal', 'large'];

        if (
            themeMode === undefined &&
            textSize === undefined &&
            highContrastEnabled === undefined
        ) {
            return res.status(400).json({
                success: false,
                error:
                    'At least one of themeMode, textSize, or highContrastEnabled must be provided.'
            });
        }

        const nextSettings = {};

        if (themeMode !== undefined) {
            if (
                typeof themeMode !== 'string' ||
                !allowedThemeModes.includes(themeMode.trim())
            ) {
                return res.status(400).json({
                    success: false,
                    error: 'themeMode must be one of: light, dark, or system.'
                });
            }

            nextSettings.themeMode = themeMode.trim();
        }

        if (textSize !== undefined) {
            if (
                typeof textSize !== 'string' ||
                !allowedTextSizes.includes(textSize.trim())
            ) {
                return res.status(400).json({
                    success: false,
                    error: 'textSize must be one of: small, normal, or large.'
                });
            }

            nextSettings.textSize = textSize.trim();
        }

        if (highContrastEnabled !== undefined) {
            const normalizedHighContrast = normalizeHighContrastEnabled(
                highContrastEnabled
            );

            if (normalizedHighContrast === null) {
                return res.status(400).json({
                    success: false,
                    error:
                        'highContrastEnabled must be true, false, 1, 0, "true", or "false".'
                });
            }

            nextSettings.highContrastEnabled = normalizedHighContrast;
        }

        await userModel.ensureAccessibilitySettingsExist(accountId);

        const currentSettings = await userModel.getAccessibilitySettingsByAccountId(
            accountId
        );

        await userModel.updateAccessibilitySettings(accountId, {
            themeMode: nextSettings.themeMode ?? currentSettings.themeMode,
            textSize: nextSettings.textSize ?? currentSettings.textSize,
            highContrastEnabled:
                nextSettings.highContrastEnabled ??
                currentSettings.highContrastEnabled
        });

        const updatedAccessibility =
            await userModel.getAccessibilitySettingsByAccountId(accountId);

        return res.json({
            success: true,
            message: 'Accessibility settings updated successfully.',
            accessibility: updatedAccessibility
        });
    } catch (error) {
        console.error('Update accessibility settings error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while updating accessibility settings.'
        });
    }
};

/**
 * Update answers for the user's security questions
 * PUT /api/users/me/security-questions
 * Requires authentication
 * Input: { securityQuestions: [{ questionId, answer }] }
 * Output: { success, message, securityQuestions }
 */
const updateUserSecurityQuestions = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const { securityQuestions } = req.body;

        if (!Array.isArray(securityQuestions) || securityQuestions.length === 0) {
            return res.status(400).json({
                success: false,
                error:
                    'securityQuestions must be a non-empty array of question updates.'
            });
        }

        const existingQuestions = await userModel.getUserSecurityQuestions(accountId);

        if (existingQuestions.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No security questions found for this account.'
            });
        }

        const existingQuestionIds = new Set(
            existingQuestions.map((question) => Number(question.question_id))
        );
        const seenQuestionIds = new Set();
        const questionsWithHashes = [];

        for (const securityQuestion of securityQuestions) {
            const questionId = Number(securityQuestion?.questionId);
            const answer =
                typeof securityQuestion?.answer === 'string'
                    ? securityQuestion.answer.trim()
                    : '';

            if (!Number.isInteger(questionId) || questionId <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Each security question update must include a valid questionId.'
                });
            }

            if (!existingQuestionIds.has(questionId)) {
                return res.status(400).json({
                    success: false,
                    error:
                        'One or more questionId values do not belong to the authenticated user.'
                });
            }

            if (seenQuestionIds.has(questionId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Duplicate questionId values are not allowed in one request.'
                });
            }

            if (answer.length < 2 || answer.length > 255) {
                return res.status(400).json({
                    success: false,
                    error:
                        'Each security answer must be between 2 and 255 characters.'
                });
            }

            seenQuestionIds.add(questionId);
            questionsWithHashes.push({
                questionId,
                answerHash: await hashPassword(answer)
            });
        }

        await userModel.updateUserSecurityQuestionAnswers(
            accountId,
            questionsWithHashes
        );

        const updatedSecurityQuestions = await userModel.getUserSecurityQuestions(
            accountId
        );

        return res.json({
            success: true,
            message: 'Security question answers updated successfully.',
            securityQuestions: updatedSecurityQuestions.map((question) => ({
                question_id: question.question_id,
                question_text: question.question_text
            }))
        });
    } catch (error) {
        console.error('Update security questions error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while updating security questions.'
        });
    }
};

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

/**
 * Return one complete dashboard payload for the authenticated user
 * GET /api/users/me/dashboard
 * Requires Authorization: Bearer <accessToken>
 * Output: { success, dashboard }
 */
const getDashboard = async (req, res) => {
    try {
        const accountId = req.user.account_id;

        const [
            profile,
            accessibilitySettings,
            goals,
            projects,
            milestones,
            academicProgress,
            wellnessEntries
        ] = await Promise.all([
            dashboardModel.getUserProfile(accountId),
            dashboardModel.getAccessibilitySettings(accountId),
            dashboardModel.getGoalsByAccountId(accountId),
            dashboardModel.getProjectsByAccountId(accountId),
            dashboardModel.getMilestonesByAccountId(accountId),
            dashboardModel.getAcademicProgressByAccountId(accountId),
            dashboardModel.getWellnessEntriesByAccountId(accountId)
        ]);

        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'Authenticated user was not found.'
            });
        }

        const projectsWithMilestones = attachMilestonesToProjects(projects, milestones);
        const summary = buildDashboardSummary(
            goals,
            projects,
            milestones,
            academicProgress,
            wellnessEntries
        );

        return res.json({
            success: true,
            dashboard: {
                profile,
                accessibilitySettings,
                summary,
                goals,
                projects: projectsWithMilestones,
                academicProgress,
                wellnessMoodEntries: wellnessEntries
            }
        });
    } catch (error) {
        console.error('Dashboard fetch error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while loading dashboard data.'
        });
    }
};

/**
 * Upload a new profile image, generate its thumbnail, and save both URL
 * POST /api/users/me/profile-image
 * Requires multipart/form-data with field name profileImage.
 * Requires Authorization: Bearer <accessToken>
 * Output: { success, message, image }
 */
const uploadProfileImage = async (req, res) => {
    const uploadedFilePath = req.file?.path;
    let thumbnailFilePath = null;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'A profile image file is required.'
            });
        }

        const accountId = req.user.account_id;

        await sharp(uploadedFilePath).metadata();

        const thumbnailDirectory = path.join(
            __dirname,
            '..',
            'public',
            'uploads',
            'profileThumbnails'
        );

        await fs.mkdir(thumbnailDirectory, { recursive: true });

        const originalFileName = path.basename(
            req.file.filename,
            path.extname(req.file.filename)
        );
        const thumbnailFileName = `${originalFileName}-thumb.jpg`;
        thumbnailFilePath = path.join(thumbnailDirectory, thumbnailFileName);

        await sharp(uploadedFilePath)
            .resize(256, 256, { fit: 'cover', position: 'centre' })
            .jpeg({ quality: 80 })
            .toFile(thumbnailFilePath);

        const relativeOriginalPath = path.posix.join(
            'uploads',
            'profileImages',
            req.file.filename
        );
        const relativeThumbnailPath = path.posix.join(
            'uploads',
            'profileThumbnails',
            thumbnailFileName
        );

        const profileImageUrl = buildPublicFileUrl(req, relativeOriginalPath);
        const profileThumbnailUrl = buildPublicFileUrl(req, relativeThumbnailPath);

        const previousImages = await profileImageModel.getProfileImageUrlsByAccountId(
            accountId
        );

        await profileImageModel.updateProfileImageUrls(
            accountId,
            profileImageUrl,
            profileThumbnailUrl
        );

        await deleteLocalUploadFromUrl(previousImages?.profileImageUrl);
        await deleteLocalUploadFromUrl(previousImages?.profileThumbnailUrl);

        return res.status(201).json({
            success: true,
            message: 'Profile image uploaded successfully!',
            image: {
                profileImageUrl,
                profileThumbnailUrl,
                originalFileName: req.file.originalname,
                fileSizeBytes: req.file.size,
                mimeType: req.file.mimetype
            }
        });
    } catch (error) {
        console.error('Profile image upload error:', error);

        if (uploadedFilePath) {
            await fs.unlink(uploadedFilePath).catch(() => {});
        }

        if (thumbnailFilePath) {
            await fs.unlink(thumbnailFilePath).catch(() => {});
        }

        return res.status(500).json({
            success: false,
            error: 'An error occurred while uploading the profile image.'
        });
    }
};

/**
 * Confirm that bcrypt hashing and verification are working correctly
 * GET /api/users/bcrypt-test
 * Hashes a test string, verifies a correct and incorrect password against it
 * No authentication required - used to demonstrate bcrypt is working
 * Output: { success, bcryptWorking, details }
 */
const bcryptTest = async (req, res) => {
    try {
        const bcrypt = require('bcrypt');
        const testPassword = 'TestPassword123!';
        const saltRounds = Number(process.env.BCRYPT_ROUNDS || 12);

        // Hash the test password 
        const hash = await bcrypt.hash(testPassword, saltRounds);

        // Verify correct password matches the hash
        const correctMatch = await bcrypt.compare(testPassword, hash);

        // Verify wrong password doesnt match the hash
        const wrongMatch = await bcrypt.compare('WrongPassword!', hash);

        const bcryptWorking = correctMatch === true && wrongMatch === false;

        res.json({
            success: true,
            bcryptWorking,
            details: {
                saltRoundsUsed: saltRounds,
                hashGenerated: hash,
                correctPasswordMatches: correctMatch,
                wrongPasswordMatches: wrongMatch,
                verdict: bcryptWorking
                    ? 'PASS - bcrypt is working correctly'
                    : 'FAIL - check bcrypt installation'
            }
        });
    } catch (error) {
        console.error('bcrypt test error:', error);
        res.status(500).json({
            success: false,
            bcryptWorking: false,
            error: 'bcrypt test failed: ' + error.message
        });
    }
};

/**
 * Get current user's complete profile
 * Requires authentication
 * GET /api/users/me/profile
 * Output: { success, profile }
 */
const getUserProfile = async (req, res) => {
    try {
        const accountId = req.user.account_id;

        const profile = await userModel.getUserProfile(accountId);

        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'User profile not found'
            });
        }

        // Remove sensitive fields from being shown
        delete profile.password_hash;

        res.json({
            success: true,
            profile
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching profile'
        });
    }
};

/**
 * Update current user's profile
 * Requires authentication
 * PUT /api/users/me/profile
 * Input: { name, major, year, university } (at least one required)
 * Output: { success, message, profile }
 */
const updateUserProfile = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const { name, major, academicYear, university } = req.body;

        // Create object to only grab provided fields
        const updateFields = {};

        if (name !== undefined && name !== null && name.trim() !== '') {
            updateFields.name = name.trim();
        }
        if (major !== undefined && major !== null && major.trim() !== '') {
            updateFields.major = major.trim();
        }
        if (academicYear !== undefined && academicYear !== null && academicYear.trim() !== '') {
            updateFields.academicYear = academicYear.trim();
        }
        if (university !== undefined && university !== null && university.trim() !== '') {
            updateFields.university = university.trim();
        }

        // Check if any field were provided
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one field must be provided'
            });
        }

        // Validate field lengths
        if (updateFields.name && updateFields.name.length > 150) {
            return res.status(400).json({
                success: false,
                error: 'Name must not exceed 150 characters'
            });
        }
        if (updateFields.major && updateFields.major.length > 150) {
            return res.status(400).json({
                success: false,
                error: 'Major must not exceed 150 characters'
            });
        }
        if (updateFields.academicYear && updateFields.academicYear.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Academic Year must not exceed 50 characters'
            });
        }
        if (updateFields.university && updateFields.university.length > 150) {
            return res.status(400).json({
                success: false,
                error: 'University must not exceed 150 characters'
            });
        }

        // Update user profile
        await userModel.updateUserProfile(accountId, updateFields);

        // Fetch updated profile & remove sensitive fields
        const updatedProfile = await userModel.getUserProfile(accountId);
        delete updatedProfile.password_hash;

        res.json({
            success: true,
            message: 'Profile updated successfully',
            profile: updatedProfile
        });
    } catch (error) {
        console.error('Update user profile error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while udpating profile'
        });
    }
};

/**
 * Change user's password
 * Requires authentication
 * PUT /api/users/me/password
 * Input: { currentPassword, newPassword, answers }
 * Output: { success, message }
 */
const changePassword = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const { currentPassword, newPassword, answers } = req.body;

        // Validate required fields
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are requried'
            });
        }

        // Validate new password strength
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 8 characters long'
            });
        }

        // Validate if security questions answers are provided
        if (!answers || !Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Security question answers are required'
            });
        }

        // Get current user's password hash
        const passwordHash = await userModel.getUserPasswordHash(accountId);

        if (!passwordHash) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Verify current password
        const isPasswordValid = await verifyPassword(currentPassword, passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrent'
            });
        }

        // Fetch user's security questions with hashed answers
        const [questions] = await pool.query(
            `SELECT question_id, answer_hash 
             FROM user_security_questions 
             WHERE account_id = ?`,
            [accountId]
        );

        if (questions.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No security questions found for this account'
            });
        }

        // Verify each security answer
        for (const answer of answers) {
            const question = questions.find(q => q.question_id === answer.question_id);
            if (!question) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid question ID'
                });
            }

            const isAnswerValid = await verifyPassword(answer.answer, question.answer_hash);
            if (!isAnswerValid) {
                return res.status(401).json({
                    success: false,
                    error: 'One or more security answers are incorrect'
                });
            }
        }

        // Hash and update new password
        const newPasswordHash = await hashPassword(newPassword);
        await userModel.updateUserPassword(accountId, newPasswordHash);

        // Invalidate all refresh tokens
        // User must login again
        const { invalidateAllUserRefreshTokens } = require('../middleware/authenticate');
        await invalidateAllUserRefreshTokens(accountId);

        res.json({
            success: true,
            message: 'Password has been changed successfully. Please log in again.'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while changing password'
        });
    }
};

/**
 * Get current user's security questions
 * Requires authentication
 * GET /api/users/me/security-questions
 * Output: { success, securityQuestions }
 */
const getUserSecurityQuestions = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const securityQuestions = await userModel.getUserSecurityQuestions(accountId);

        res.json({
            success: true,
            securityQuestions: securityQuestions.map(q => ({
                question_id: q.question_id,
                question_text: q.question_text
            }))
        });
    } catch (error) {
        console.error('Get security questions error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching security questions'
        });
    }
};

module.exports = {
    getSecurityQuestions,
    getDashboard,
    uploadProfileImage,
    bcryptTest,
    getUserProfile,
    updateUserProfile,
    changePassword,
    getUserSecurityQuestions
};
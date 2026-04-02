// controllers/userController.js
// Handles user-related endpoints
// Contains endpoints for user data that doesn't require authentication

const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const dashboardModel = require('../models/dashboardModel');
const profileImageModel = require('../models/profileImageModel');

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

module.exports = {
    getSecurityQuestions,
    getDashboard,
    uploadProfileImage,
    bcryptTest
};
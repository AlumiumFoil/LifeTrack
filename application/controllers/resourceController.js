// controllers/resourceModuleController.js
// Handles resource module endpoints
// Includes Resume, Wellness Check-In Module, and Sleep Routine module endpoints

const resourceModuleModel = require('../models/resourceModuleModel');
const wellnessModel = require('../models/wellnessModel');

/**
 * Parse a comma separated tag string into an array
 * @param {string} tagsCsv - Comma separated tags
 * @returns {Array} Tag array
 */
const parseTagsCsv = (tagsCsv) => {
    if (!tagsCsv || !tagsCsv.trim()) {
        return [];
    }

    return tagsCsv
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
};

/**
 * Format one resource row for API output
 * @param {object} resource - Raw resource row
 * @returns {object} Formatted resource metadata
 */
const formatResource = (resource) => ({
    resourceId: resource.resourceId,
    title: resource.title,
    description: resource.description,
    url: resource.url,
    imageUrl: resource.imageUrl,
    thumbnailUrl: resource.thumbnailUrl,
    mediaPath: resource.mediaPath,
    contentType: resource.contentType,
    category: resource.category,
    useCase: resource.useCase,
    skillArea: resource.skillArea,
    tags: parseTagsCsv(resource.tagsCsv)
});

/**
 * Format one sleep habit row for API output
 * @param {object} habit - Raw habit row
 * @returns {object} Sleep habit output
 */
const formatSleepHabit = (habit) => ({
    habitId: habit.habitId,
    accountId: habit.accountId,
    title: habit.title,
    description: habit.description,
    category: habit.category,
    frequency: habit.frequency,
    status: habit.status,
    lastCompletedDate: habit.lastCompletedDate,
    streakCount: habit.streakCount,
    createdAt: habit.createdAt,
    updatedAt: habit.updatedAt
});

/**
 * GET /api/resources/modules/resume
 * Return resume resource metadata and user specific prefill data
 * Requires authentication
 * Output: { success, resource, prefill }
 */
const getResumeModule = async (req, res) => {
    try {
        const accountId = req.user.account_id;

        const [resource, prefill, careerGoals] = await Promise.all([
            resourceModuleModel.getPublicResourceByUrl('resources/resume.html'),
            resourceModuleModel.getResumePrefillByAccountId(accountId),
            resourceModuleModel.getCareerGoalSuggestionsByAccountId(accountId)
        ]);

        if (!resource) {
            return res.status(404).json({
                success: false,
                error: 'Resume resource not found'
            });
        }

        return res.json({
            success: true,
            resource: formatResource(resource),
            prefill: {
                accountId: prefill?.accountId || accountId,
                email: prefill?.email || null,
                username: prefill?.username || null,
                fullName: prefill?.fullName || null,
                university: prefill?.university || null,
                major: prefill?.major || null,
                academicYear: prefill?.academicYear || null,
                careerGoalSuggestions: careerGoals
            }
        });
    } catch (error) {
        console.error('Get resume module error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while fetching the resume module'
        });
    }
};

/**
 * GET /api/resources/modules/wellness-check-in
 * Return wellness module metadata plus the user's wellness check-in data
 * Requires authentication
 * Output: { success, resource, todayCheckin, history }
 */
const getWellnessCheckInModule = async (req, res) => {
    try {
        const accountId = req.user.account_id;

        const [resource, todayCheckin, history] = await Promise.all([
            resourceModuleModel.getPublicResourceByUrl('resources/wellnessModule.html'),
            wellnessModel.getTodayMood(accountId),
            wellnessModel.getMoodHistory(accountId)
        ]);

        if (!resource) {
            return res.status(404).json({
                success: false,
                error: 'Wellness Check-In resource not found'
            });
        }

        return res.json({
            success: true,
            resource: formatResource(resource),
            todayCheckin,
            history
        });
    } catch (error) {
        console.error('Get wellness check-in module error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while fetching the wellness module'
        });
    }
};

/**
 * GET /api/resources/modules/sleep-routine
 * Return sleep routine resource metadata and the user's sleep related habits
 * Requires authentication
 * Output: { success, resource, habits }
 */
const getSleepRoutineModule = async (req, res) => {
    try {
        const accountId = req.user.account_id;

        const [resource, habits] = await Promise.all([
            resourceModuleModel.getPublicResourceByUrl('resources/sleepRoutine.html'),
            resourceModuleModel.getSleepRoutineHabitsByAccountId(accountId)
        ]);

        if (!resource) {
            return res.status(404).json({
                success: false,
                error: 'Sleep routine resource not found'
            });
        }

        return res.json({
            success: true,
            resource: formatResource(resource),
            habits: habits.map(formatSleepHabit)
        });
    } catch (error) {
        console.error('Get sleep routine module error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while fetching the sleep routine module'
        });
    }
};

/**
 * POST /api/resources/modules/sleep-routine/habits
 * Create a new sleep related habit from the sleep routine module
 * Requires authentication
 * Input: { title, description?, frequency? }
 * Output: { success, message, habitId }
 */
const createSleepRoutineHabit = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const { title, description, frequency } = req.body;

        const allowedFrequencies = new Set(['daily', 'weekly', 'custom']);

        if (!title || !String(title).trim()) {
            return res.status(400).json({
                success: false,
                error: 'Sleep routine habit title is required'
            });
        }

        if (String(title).trim().length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Sleep routine habit title must not exceed 255 characters'
            });
        }

        if (
            frequency !== undefined &&
            frequency !== null &&
            !allowedFrequencies.has(String(frequency).trim().toLowerCase())
        ) {
            return res.status(400).json({
                success: false,
                error: 'frequency must be one of: daily, weekly, or custom'
            });
        }

        const habitId = await resourceModuleModel.createSleepRoutineHabit(accountId, {
            title: String(title).trim(),
            description: description ? String(description).trim() : null,
            frequency: frequency ? String(frequency).trim().toLowerCase() : 'daily'
        });

        return res.status(201).json({
            success: true,
            message: 'Sleep routine habit created successfully',
            habitId
        });
    } catch (error) {
        console.error('Create sleep routine habit error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while creating the sleep routine habit'
        });
    }
};

/**
 * POST /api/resources/modules/sleep-routine/habits/:id/complete
 * Mark a sleep routine habit as completed today
 * Requires authentication
 * Output: { success, message, streak }
 */
const completeSleepRoutineHabit = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const habitId = Number(req.params.id);

        if (!Number.isInteger(habitId) || habitId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Habit id must be a positive integer'
            });
        }

        const result = await wellnessModel.completeHabit(habitId, accountId);

        if (result.alreadyCompleted) {
            return res.status(409).json({
                success: false,
                error: 'Sleep routine habit already completed today'
            });
        }

        if (!result.completed) {
            return res.status(404).json({
                success: false,
                error: 'Sleep routine habit not found'
            });
        }

        return res.json({
            success: true,
            message: 'Sleep routine habit marked as completed',
            streak: result.newStreak
        });
    } catch (error) {
        console.error('Complete sleep routine habit error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while completing the sleep routine habit'
        });
    }
};

module.exports = {
    getResumeModule,
    getWellnessCheckInModule,
    getSleepRoutineModule,
    createSleepRoutineHabit,
    completeSleepRoutineHabit
};
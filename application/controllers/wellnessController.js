// controllers/wellnessController.js
// Handles business logic for wellness features (mood check-ins, habits)

const wellnessModel = require('../models/wellnessModel');

/**
 * Submit a mood check-in
 * Requires authentication
 * POST /api/wellness/checkin
 * Input: { mood, note }
 * Output: { success, message, entryId }
 */
const submitCheckin = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const { mood, note } = req.body;
        
        // Validate required fields
        if (!mood || mood.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Mood is required'
            });
        }
        
        // Validate mood value and convert to integer
        const moodValue = wellnessModel.MOOD_MAP[mood];
        if (!moodValue) {
            return res.status(400).json({
                success: false,
                error: 'Invalid mood value. Allowed: Great, Good, Okay, Low, Struggling'
            });
        }
        
        // Check if user already checked in today
        const todayMood = await wellnessModel.getTodayMood(accountId);
        if (todayMood) {
            return res.status(409).json({
                success: false,
                error: 'You have already checked in today. Only one check-in per day is allowed.'
            });
        }
        
        const entryId = await wellnessModel.saveMoodCheckin(accountId, {
            moodValue: moodValue,
            note: note || null
        });
        
        res.status(201).json({
            success: true,
            message: 'Mood check-in saved successfully',
            entryId: entryId
        });
    } catch (error) {
        console.error('Submit check-in error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while saving your check-in'
        });
    }
};

/**
 * Get mood check-in history
 * Requires authentication
 * GET /api/wellness/checkins
 * Output: { success, history, todayCheckin }
 */
const getCheckinHistory = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        
        const [history, todayCheckin] = await Promise.all([
            wellnessModel.getMoodHistory(accountId),
            wellnessModel.getTodayMood(accountId)
        ]);
        
        res.json({
            success: true,
            history,
            todayCheckin
        });
    } catch (error) {
        console.error('Get check-in history error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching check-in history'
        });
    }
};

/**
 * Get all habits for authenticated user
 * Requires authentication
 * GET /api/wellness/habits
 * Output: { success, habits, stats }
 */
const getHabits = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        
        const [habits, stats] = await Promise.all([
            wellnessModel.getUserHabits(accountId),
            wellnessModel.getHabitStats(accountId)
        ]);
        
        res.json({
            success: true,
            habits,
            stats
        });
    } catch (error) {
        console.error('Get habits error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching habits'
        });
    }
};

/**
 * Get a single habit by ID
 * Requires authentication
 * GET /api/wellness/habits/:id
 * Output: { success, habit }
 */
const getHabitById = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const habitId = req.params.id;
        
        const habit = await wellnessModel.getHabitById(habitId, accountId);
        
        if (!habit) {
            return res.status(404).json({
                success: false,
                error: 'Habit not found'
            });
        }
        
        res.json({
            success: true,
            habit
        });
    } catch (error) {
        console.error('Get habit by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching the habit'
        });
    }
};

/**
 * Create a new habit
 * Requires authentication
 * POST /api/wellness/habits
 * Input: { title, description, category, frequency }
 * Output: { success, message, habitId }
 */
const createHabit = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const { title, description, category, frequency } = req.body;
        
        // Validate required fields
        if (!title || title.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Habit title is required'
            });
        }
        
        // Validate title length
        if (title.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Habit title must not exceed 255 characters'
            });
        }
        
        const habitId = await wellnessModel.createHabit(accountId, {
            title: title.trim(),
            description: description ? description.trim() : null,
            category: category || null,
            frequency: frequency || 'daily'
        });
        
        res.status(201).json({
            success: true,
            message: 'Habit created successfully',
            habitId: habitId
        });
    } catch (error) {
        console.error('Create habit error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while creating the habit'
        });
    }
};

/**
 * Update an existing habit
 * Requires authentication
 * PUT /api/wellness/habits/:id
 * Input: { title, description, category, frequency, status }
 * Output: { success, message }
 */
const updateHabit = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const habitId = req.params.id;
        const { title, description, category, frequency, status } = req.body;
        
        // Check if habit exists and belongs to user
        const existingHabit = await wellnessModel.getHabitById(habitId, accountId);
        if (!existingHabit) {
            return res.status(404).json({
                success: false,
                error: 'Habit not found'
            });
        }
        
        // Validate title length if provided
        if (title !== undefined && title.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Habit title must not exceed 255 characters'
            });
        }
        
        const updated = await wellnessModel.updateHabit(habitId, accountId, {
            title: title !== undefined ? title.trim() : undefined,
            description: description !== undefined ? (description ? description.trim() : null) : undefined,
            category: category !== undefined ? category : undefined,
            frequency: frequency !== undefined ? frequency : undefined,
            status: status !== undefined ? status : undefined
        });
        
        res.json({
            success: true,
            message: 'Habit updated successfully'
        });
    } catch (error) {
        console.error('Update habit error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while updating the habit'
        });
    }
};

/**
 * Delete a habit (soft delete)
 * Requires authentication
 * DELETE /api/wellness/habits/:id
 * Output: { success, message }
 */
const deleteHabit = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const habitId = req.params.id;
        
        const deleted = await wellnessModel.deleteHabit(habitId, accountId);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Habit not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Habit deleted successfully'
        });
    } catch (error) {
        console.error('Delete habit error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while deleting the habit'
        });
    }
};

/**
 * Mark habit as completed for today
 * Requires authentication
 * POST /api/wellness/habits/:id/complete
 * Output: { success, message, streak }
 */
const completeHabit = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const habitId = req.params.id;
        
        const result = await wellnessModel.completeHabit(habitId, accountId);
        
        if (result.alreadyCompleted) {
            return res.status(409).json({
                success: false,
                error: 'Habit already completed today'
            });
        }
        
        if (!result.completed) {
            return res.status(404).json({
                success: false,
                error: 'Habit not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Habit marked as completed!',
            streak: result.newStreak
        });
    } catch (error) {
        console.error('Complete habit error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while completing the habit'
        });
    }
};

/**
 * Get wellness resources (static list for now)
 * No authentication required
 * GET /api/wellness/resources
 * Output: { success, resources }
 */
const getWellnessResources = async (req, res) => {
    try {
        const resources = [
            {
                id: 1,
                title: 'Mental Health America',
                description: 'Resources for mental health support and education',
                url: 'https://mhanational.org',
                category: 'Mental Health'
            },
            {
                id: 2,
                title: 'CDC - Stress Management',
                description: 'Tips for coping with stress',
                url: 'https://www.cdc.gov/copingwithstress',
                category: 'Stress'
            },
            {
                id: 3,
                title: 'Headspace Guide to Meditation',
                description: 'Learn the basics of mindfulness',
                url: 'https://www.headspace.com',
                category: 'Meditation'
            },
            {
                id: 4,
                title: 'Sleep Foundation',
                description: 'Resources for better sleep hygiene',
                url: 'https://www.sleepfoundation.org',
                category: 'Sleep'
            },
            {
                id: 5,
                title: 'National Suicide Prevention Lifeline',
                description: '24/7 free and confidential support',
                url: '988lifeline.org',
                category: 'Crisis'
            }
        ];
        
        res.json({
            success: true,
            resources
        });
    } catch (error) {
        console.error('Get wellness resources error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching resources'
        });
    }
};

module.exports = {
    // Mood check-in
    submitCheckin,
    getCheckinHistory,
    
    // Habits
    getHabits,
    getHabitById,
    createHabit,
    updateHabit,
    deleteHabit,
    completeHabit,
    
    // Resources
    getWellnessResources
};
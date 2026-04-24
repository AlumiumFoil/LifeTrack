// models/wellnessModel.js
// Handles all database operations for wellness features

const pool = require('../config/db');

// Map frontend text values to database integers
const MOOD_MAP = {
    'Great': 5,
    'Good': 4,
    'Okay': 3,
    'Low': 2,
    'Struggling': 1
};

// Map database integers to frontend text values
const REVERSE_MOOD_MAP = {
    5: 'Great',
    4: 'Good',
    3: 'Okay',
    2: 'Low',
    1: 'Struggling'
};

/**
 * Save a mood check-in entry
 * @param {number} accountId - User's account ID
 * @param {object} data - { moodValue, note }
 * @returns {Promise<number>} Inserted entry ID
 */
const saveMoodCheckin = async (accountId, data) => {
    const { moodValue, note } = data;
    
    const [result] = await pool.query(
        `INSERT INTO wellness_mood_entries (account_id, mood_value, note, created_at)
         VALUES (?, ?, ?, NOW())`,
        [accountId, moodValue, note || null]
    );
    return result.insertId;
};

/**
 * Get mood check-in history for a user (last 30 days)
 * @param {number} accountId - User's account ID
 * @returns {Promise<Array>} Array of check-in entries
 */
const getMoodHistory = async (accountId) => {
    const [entries] = await pool.query(
        `SELECT 
            entry_id AS id,
            mood_value AS moodValue,
            note,
            created_at AS createdAt
         FROM wellness_mood_entries
         WHERE account_id = ?
         ORDER BY created_at DESC
         LIMIT 30`,
        [accountId]
    );
    
    // Convert mood numbers to display strings
    return entries.map(entry => ({
        ...entry,
        mood: REVERSE_MOOD_MAP[entry.moodValue] || 'Okay'
    }));
};

/**
 * Get today's mood check-in (if exists)
 * @param {number} accountId - User's account ID
 * @returns {Promise<object|null>} Today's entry or null
 */
const getTodayMood = async (accountId) => {
    const [entries] = await pool.query(
        `SELECT 
            entry_id AS id,
            mood_value AS moodValue,
            note,
            created_at AS createdAt
         FROM wellness_mood_entries
         WHERE account_id = ? AND DATE(created_at) = CURDATE()
         ORDER BY created_at DESC
         LIMIT 1`,
        [accountId]
    );
    
    if (entries.length === 0) return null;
    
    return {
        ...entries[0],
        mood: REVERSE_MOOD_MAP[entries[0].moodValue] || 'Okay'
    };
};

/**
 * Get all habits for a user (active only)
 * @param {number} accountId - User's account ID
 * @returns {Promise<Array>} Array of habit objects
 */
const getUserHabits = async (accountId) => {
    const [habits] = await pool.query(
        `SELECT 
            habit_id AS id,
            title,
            description,
            category,
            frequency,
            status,
            last_completed_date AS lastCompletedDate,
            streak_count AS streakCount,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM habits
         WHERE account_id = ? AND status = 'active'
         ORDER BY created_at ASC`,
        [accountId]
    );
    return habits;
};

/**
 * Get a single habit by ID if active (verify ownership)
 * @param {number} habitId - Habit ID
 * @param {number} accountId - User's account ID
 * @returns {Promise<object|null>} Habit object or null
 */
const getHabitById = async (habitId, accountId) => {
    const [habits] = await pool.query(
        `SELECT 
            habit_id AS id,
            title,
            description,
            category,
            frequency,
            status,
            last_completed_date AS lastCompletedDate,
            streak_count AS streakCount,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM habits
         WHERE habit_id = ? AND account_id = ? AND status = 'active'`,
        [habitId, accountId]
    );
    return habits.length > 0 ? habits[0] : null;
};

/**
 * Create a new habit for a user
 * @param {number} accountId - User's account ID
 * @param {object} habitData - { title, description, category, frequency }
 * @returns {Promise<number>} Inserted habit ID
 */
const createHabit = async (accountId, habitData) => {
    const { title, description, category, frequency } = habitData;
    
    const [result] = await pool.query(
        `INSERT INTO habits (account_id, title, description, category, frequency, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [accountId, title, description || null, category || null, frequency || 'daily']
    );
    return result.insertId;
};

/**
 * Update an existing habit
 * @param {number} habitId - Habit ID
 * @param {number} accountId - User's account ID
 * @param {object} habitData - Updated habit data
 * @returns {Promise<boolean>} True if updated
 */
const updateHabit = async (habitId, accountId, habitData) => {
    const { title, description, category, frequency, status } = habitData;
    
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
    }
    if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
    }
    if (category !== undefined) {
        updates.push('category = ?');
        values.push(category);
    }
    if (frequency !== undefined) {
        updates.push('frequency = ?');
        values.push(frequency);
    }
    if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
    }
    
    updates.push('updated_at = NOW()');
    values.push(habitId, accountId);
    
    const [result] = await pool.query(
        `UPDATE habits SET ${updates.join(', ')} WHERE habit_id = ? AND account_id = ?`,
        values
    );
    return result.affectedRows > 0;
};

/**
 * Delete a habit (soft delete by setting status to 'archived')
 * Only deletes if status is currently 'active'
 * @param {number} habitId - Habit ID
 * @param {number} accountId - User's account ID
 * @returns {Promise<boolean>} True if deleted
 */
const deleteHabit = async (habitId, accountId) => {
    const [result] = await pool.query(
        `UPDATE habits SET status = 'archived', updated_at = NOW() 
         WHERE habit_id = ? AND account_id = ? AND status = 'active'`,
        [habitId, accountId]
    );
    return result.affectedRows > 0;
};

/**
 * Mark habit as completed for today
 * Updates last_completed_date and calculates streak count
 * @param {number} habitId - Habit ID
 * @param {number} accountId - User's account ID
 * @returns {Promise<object>} { completed, newStreak, alreadyCompleted }
 */
const completeHabit = async (habitId, accountId) => {
    // Get current habit data
    const habit = await getHabitById(habitId, accountId);
    if (!habit) return { completed: false, alreadyCompleted: false };
    
    const today = new Date().toISOString().slice(0, 10);
    const lastCompleted = habit.lastCompletedDate ? habit.lastCompletedDate.toISOString().slice(0, 10) : null;
    
    // Already completed today
    if (lastCompleted === today) {
        return { completed: false, alreadyCompleted: true };
    }
    
    // Calculate new streak
    let newStreak = 1;
    if (habit.lastCompletedDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        
        if (lastCompleted === yesterdayStr) {
            newStreak = (habit.streakCount || 0) + 1;
        }
    }
    
    // Update habit with completion
    await pool.query(
        `UPDATE habits 
         SET last_completed_date = CURDATE(), streak_count = ?, updated_at = NOW()
         WHERE habit_id = ? AND account_id = ?`,
        [newStreak, habitId, accountId]
    );
    
    return { completed: true, newStreak, alreadyCompleted: false };
};

/**
 * Get active habit statistics for a user
 * @param {number} accountId - User's account ID
 * @returns {Promise<object>} Statistics object
 */
const getHabitStats = async (accountId) => {
    const [stats] = await pool.query(
        `SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN last_completed_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS completedThisWeek
         FROM habits
         WHERE account_id = ? AND status = 'active'`,
        [accountId]
    );
    
    return {
        total: Number(stats[0].total) || 0,
        active: Number(stats[0].total) || 0,  // Same as total since we only count active
        completedThisWeek: Number(stats[0].completedThisWeek) || 0
    };
};

module.exports = {
    // Mood mapping
    MOOD_MAP,
    REVERSE_MOOD_MAP,
    
    // Mood check-in functions
    saveMoodCheckin,
    getMoodHistory,
    getTodayMood,
    
    // Habit functions
    getUserHabits,
    getHabitById,
    createHabit,
    updateHabit,
    deleteHabit,
    completeHabit,
    getHabitStats
};
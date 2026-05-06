// models/academicModel.js
// Handles all database operations for academic features

const pool = require('../config/db');

// Helper Function
/**
 * Format a date object to YYYY-MM-DD string
 * @param {Date|null} date - Date object or null
 * @returns {string|null} Formatted date string or null
 */
const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Returns YYYY-MM-DD
};

// Frontend status value reference. Values are stored in backend
const STATUS_VALUES = {
    assignment: ['not started', 'in progress', 'completed', 'graded'],
    task: ['not started', 'in progress', 'completed']
};

/**
 * Get all assignments for a user
 * @param {number} accountId - User's account ID
 * @returns {Promise<Array>} Array of assignment objects
 */
const getAssignments = async (accountId) => {
    const [assignments] = await pool.query(
        `SELECT 
            assignment_id AS id,
            account_id AS accountId,
            title,
            description,
            course_name AS courseName,
            status,
            due_date AS dueDate,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM assignments
         WHERE account_id = ?
         ORDER BY due_date ASC, created_at DESC`,
        [accountId]
    );

    return assignments.map(assignment => ({
        ...assignment,
        dueDate: formatDate(assignment.dueDate),
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt
    }));
};

/**
 * Get a single assignment by ID
 * @param {number} assignmentId - Assignment ID
 * @param {number} accountId - User's account ID
 * @returns {Promise<object|null>} Assignment object or null
 */
const getAssignmentById = async (assignmentId, accountId) => {
    const [assignments] = await pool.query(
        `SELECT 
            assignment_id AS id,
            account_id AS accountId,
            title,
            description,
            course_name AS courseName,
            status,
            due_date AS dueDate,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM assignments
         WHERE assignment_id = ? AND account_id = ?`,
        [assignmentId, accountId]
    );
    
    if (assignments.length === 0) return null;
    
    const assignment = assignments[0];
    return {
        ...assignment,
        dueDate: formatDate(assignment.dueDate),
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt
    };
};

/**
 * Create a new assignment
 * @param {number} accountId - User's account ID
 * @param {object} data - Assignment data
 * @returns {Promise<number>} Inserted assignment ID
 */
const createAssignment = async (accountId, data) => {
    const { title, description, courseName, status, dueDate } = data;
    
    const [result] = await pool.query(
        `INSERT INTO assignments (account_id, title, description, course_name, status, due_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [accountId, title, description || null, courseName || null, status || 'not started', dueDate || null]
    );
    return result.insertId;
};

/**
 * Update an assignment
 * @param {number} assignmentId - Assignment ID
 * @param {number} accountId - User's account ID
 * @param {object} data - Updated assignment data
 * @returns {Promise<boolean>} True if updated
 */
const updateAssignment = async (assignmentId, accountId, data) => {
    const { title, description, courseName, status, dueDate } = data;
    
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
    if (courseName !== undefined) {
        updates.push('course_name = ?');
        values.push(courseName);
    }
    if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
    }
    if (dueDate !== undefined) {
        updates.push('due_date = ?');
        values.push(dueDate);
    }
    
    updates.push('updated_at = NOW()');
    values.push(assignmentId, accountId);
    
    const [result] = await pool.query(
        `UPDATE assignments SET ${updates.join(', ')} WHERE assignment_id = ? AND account_id = ?`,
        values
    );
    return result.affectedRows > 0;
};

/**
 * Delete an assignment
 * @param {number} assignmentId - Assignment ID
 * @param {number} accountId - User's account ID
 * @returns {Promise<boolean>} True if deleted
 */
const deleteAssignment = async (assignmentId, accountId) => {
    const [result] = await pool.query(
        `DELETE FROM assignments WHERE assignment_id = ? AND account_id = ?`,
        [assignmentId, accountId]
    );
    return result.affectedRows > 0;
};

/**
 * Get all tasks for a user
 * @param {number} accountId - User's account ID
 * @returns {Promise<Array>} Array of task objects
 */
const getTasks = async (accountId) => {
    const [tasks] = await pool.query(
        `SELECT 
            task_id AS id,
            account_id AS accountId,
            title,
            description,
            status,
            priority,
            due_date AS dueDate,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM tasks
         WHERE account_id = ?
         ORDER BY due_date ASC, created_at DESC`,
        [accountId]
    );
    
    return tasks.map(task => ({
        ...task,
        dueDate: formatDate(task.dueDate),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
    }));
};

/**
 * Get a single task by ID
 * @param {number} taskId - Task ID
 * @param {number} accountId - User's account ID
 * @returns {Promise<object|null>} Task object or null
 */
const getTaskById = async (taskId, accountId) => {
    const [tasks] = await pool.query(
        `SELECT 
            task_id AS id,
            account_id AS accountId,
            title,
            description,
            status,
            priority,
            due_date AS dueDate,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM tasks
         WHERE task_id = ? AND account_id = ?`,
        [taskId, accountId]
    );
    
    if (tasks.length === 0) return null;
    
    const task = tasks[0];
    return {
        ...task,
        dueDate: formatDate(task.dueDate),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
    };
};

/**
 * Create a new task
 * @param {number} accountId - User's account ID
 * @param {object} data - Task data
 * @returns {Promise<number>} Inserted task ID
 */
const createTask = async (accountId, data) => {
    const { title, description, status, priority, dueDate } = data;
    
    const [result] = await pool.query(
        `INSERT INTO tasks (account_id, title, description, status, priority, due_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [accountId, title, description || null, status || 'not started', priority || null, dueDate || null]
    );
    return result.insertId;
};

/**
 * Update a task
 * @param {number} taskId - Task ID
 * @param {number} accountId - User's account ID
 * @param {object} data - Updated task data
 * @returns {Promise<boolean>} True if updated
 */
const updateTask = async (taskId, accountId, data) => {
    const { title, description, status, priority, dueDate } = data;
    
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
    if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
    }
    if (priority !== undefined) {
        updates.push('priority = ?');
        values.push(priority);
    }
    if (dueDate !== undefined) {
        updates.push('due_date = ?');
        values.push(dueDate);
    }
    
    updates.push('updated_at = NOW()');
    values.push(taskId, accountId);
    
    const [result] = await pool.query(
        `UPDATE tasks SET ${updates.join(', ')} WHERE task_id = ? AND account_id = ?`,
        values
    );
    return result.affectedRows > 0;
};

/**
 * Delete a task
 * @param {number} taskId - Task ID
 * @param {number} accountId - User's account ID
 * @returns {Promise<boolean>} True if deleted
 */
const deleteTask = async (taskId, accountId) => {
    const [result] = await pool.query(
        `DELETE FROM tasks WHERE task_id = ? AND account_id = ?`,
        [taskId, accountId]
    );
    return result.affectedRows > 0;
};

/**
 * Get all study sessions for a user
 * @param {number} accountId - User's account ID
 * @returns {Promise<Array>} Array of study session objects
 */
const getStudySessions = async (accountId) => {
    const [sessions] = await pool.query(
        `SELECT 
            session_id AS id,
            account_id AS accountId,
            course_name AS courseName,
            topic,
            session_date AS sessionDate,
            duration_minutes AS durationMinutes,
            notes,
            created_at AS createdAt
         FROM study_sessions
         WHERE account_id = ?
         ORDER BY session_date DESC, created_at DESC
         LIMIT 50`,
        [accountId]
    );
    
    return sessions.map(session => ({
        ...session,
        sessionDate: formatDate(session.sessionDate),
        createdAt: session.createdAt
    }));
};

/**
 * Create a new study session
 * @param {number} accountId - User's account ID
 * @param {object} data - Study session data
 * @returns {Promise<number>} Inserted session ID
 */
const createStudySession = async (accountId, data) => {
    const { courseName, topic, sessionDate, durationMinutes, notes } = data;
    
    const [result] = await pool.query(
        `INSERT INTO study_sessions (account_id, course_name, topic, session_date, duration_minutes, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [accountId, courseName, topic || null, sessionDate || null, durationMinutes || null, notes || null]
    );
    return result.insertId;
};

/**
 * Get all unique courses for a user (from assignments)
 * @param {number} accountId - User's account ID
 * @returns {Promise<Array>} Array of course objects
 */
const getCourses = async (accountId) => {
    const [courses] = await pool.query(
        `SELECT DISTINCT 
            course_name AS name,
            COUNT(assignment_id) AS assignmentCount,
            SUM(CASE WHEN status = 'completed' OR status = 'graded' THEN 1 ELSE 0 END) AS completedCount
         FROM assignments
         WHERE account_id = ? AND course_name IS NOT NULL
         GROUP BY course_name
         ORDER BY course_name ASC`,
        [accountId]
    );
    return courses;
};

/**
 * Get academic statistics
 * @param {number} accountId - User's account ID
 * @returns {Promise<object>} Statistics object
 */
const getAcademicStats = async (accountId) => {
    // Assignment stats
    const [assignmentStats] = await pool.query(
        `SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND status != 'completed' AND status != 'graded' THEN 1 ELSE 0 END) AS dueThisWeek,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS submitted,
            SUM(CASE WHEN status = 'graded' THEN 1 ELSE 0 END) AS graded,
            COUNT(DISTINCT course_name) AS courseCount
         FROM assignments
         WHERE account_id = ?`,
        [accountId]
    );
    
    // Task stats
    const [taskStats] = await pool.query(
        `SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
         FROM tasks
         WHERE account_id = ?`,
        [accountId]
    );
    
    // Study session stats
    const [studyStats] = await pool.query(
        `SELECT 
            COUNT(*) AS total,
            COALESCE(SUM(duration_minutes), 0) AS totalMinutes
         FROM study_sessions
         WHERE account_id = ?`,
        [accountId]
    );
    
    return {
        assignments: {
            total: Number(assignmentStats[0].total) || 0,
            dueThisWeek: Number(assignmentStats[0].dueThisWeek) || 0,
            submitted: Number(assignmentStats[0].submitted) || 0,
            graded: Number(assignmentStats[0].graded) || 0,
            courseCount: Number(assignmentStats[0].courseCount) || 0
        },
        tasks: {
            total: Number(taskStats[0].total) || 0,
            completed: Number(taskStats[0].completed) || 0
        },
        studySessions: {
            total: Number(studyStats[0].total) || 0,
            totalMinutes: Number(studyStats[0].totalMinutes) || 0
        }
    };
};

/**
 * Get all planner items for a user within a date range
 * @param {number} accountId - User's account ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of planner item objects
 */
const getPlannerItemsByDateRange = async (accountId, startDate, endDate) => {
    const [items] = await pool.query(
        `SELECT 
            item_id AS id,
            account_id AS accountId,
            title,
            description,
            category,
            due_date AS dueDate,
            status,
            is_recurring AS isRecurring,
            recurring_pattern AS recurringPattern,
            recurring_end_date AS recurringEndDate,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM planner_items
         WHERE account_id = ? AND due_date BETWEEN ? AND ?
         ORDER BY due_date ASC, created_at ASC`,
        [accountId, startDate, endDate]
    );
    
    return items.map(item => ({
        ...item,
        dueDate: formatDate(item.dueDate),
        recurringEndDate: formatDate(item.recurringEndDate)
    }));
};

/**
 * Get a single planner item by ID
 * @param {number} itemId - Planner item ID
 * @param {number} accountId - User's account ID
 * @returns {Promise<object|null>} Planner item object or null
 */
const getPlannerItemById = async (itemId, accountId) => {
    const [items] = await pool.query(
        `SELECT 
            item_id AS id,
            account_id AS accountId,
            title,
            description,
            category,
            due_date AS dueDate,
            status,
            is_recurring AS isRecurring,
            recurring_pattern AS recurringPattern,
            recurring_end_date AS recurringEndDate,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM planner_items
         WHERE item_id = ? AND account_id = ?`,
        [itemId, accountId]
    );
    
    if (items.length === 0) return null;
    
    const item = items[0];
    return {
        ...item,
        dueDate: formatDate(item.dueDate),
        recurringEndDate: formatDate(item.recurringEndDate)
    };
};

/**
 * Create a new planner item
 * @param {number} accountId - User's account ID
 * @param {object} data - Planner item data
 * @returns {Promise<number>} Inserted item ID
 */
const createPlannerItem = async (accountId, data) => {
    const { title, description, category, dueDate, status, isRecurring, recurringPattern, recurringEndDate } = data;
    
    const [result] = await pool.query(
        `INSERT INTO planner_items (
            account_id, title, description, category, due_date, 
            status, is_recurring, recurring_pattern, recurring_end_date,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [accountId, title, description || null, category, dueDate, status || 'pending', 
         isRecurring || false, recurringPattern || null, recurringEndDate || null]
    );
    return result.insertId;
};

/**
 * Update an existing planner item
 * @param {number} itemId - Planner item ID
 * @param {number} accountId - User's account ID
 * @param {object} data - Updated planner item data
 * @returns {Promise<boolean>} True if updated
 */
const updatePlannerItem = async (itemId, accountId, data) => {
    const { title, description, category, dueDate, status, isRecurring, recurringPattern, recurringEndDate } = data;
    
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
    if (dueDate !== undefined) {
        updates.push('due_date = ?');
        values.push(dueDate);
    }
    if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
    }
    if (isRecurring !== undefined) {
        updates.push('is_recurring = ?');
        values.push(isRecurring);
    }
    if (recurringPattern !== undefined) {
        updates.push('recurring_pattern = ?');
        values.push(recurringPattern);
    }
    if (recurringEndDate !== undefined) {
        updates.push('recurring_end_date = ?');
        values.push(recurringEndDate);
    }
    
    updates.push('updated_at = NOW()');
    values.push(itemId, accountId);
    
    const [result] = await pool.query(
        `UPDATE planner_items SET ${updates.join(', ')} WHERE item_id = ? AND account_id = ?`,
        values
    );
    return result.affectedRows > 0;
};

/**
 * Delete a planner item
 * @param {number} itemId - Planner item ID
 * @param {number} accountId - User's account ID
 * @returns {Promise<boolean>} True if deleted
 */
const deletePlannerItem = async (itemId, accountId) => {
    const [result] = await pool.query(
        `DELETE FROM planner_items WHERE item_id = ? AND account_id = ?`,
        [itemId, accountId]
    );
    return result.affectedRows > 0;
};

/**
 * Get assignments for weekly planner
 * @param {number} accountId - User's account ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of assignment objects
 */
const getAssignmentsForPlanner = async (accountId, startDate, endDate) => {
    const [assignments] = await pool.query(
        `SELECT 
            assignment_id AS id,
            title,
            description,
            course_name AS courseName,
            due_date AS dueDate,
            'assignment' AS source,
            'Academic' AS category,
            status
         FROM assignments
         WHERE account_id = ? AND due_date BETWEEN ? AND ?
         ORDER BY due_date ASC`,
        [accountId, startDate, endDate]
    );
    
    return assignments.map(assignment => ({
        ...assignment,
        dueDate: formatDate(assignment.dueDate),
        source: 'assignment',
        category: 'Academic'
    }));
};

/**
 * Get weekly planner
 * @param {number} accountId - User's account ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Combined and sorted array of all items
 */
const getWeeklyPlanner = async (accountId, startDate, endDate) => {
    // Get assignments
    const assignments = await getAssignmentsForPlanner(accountId, startDate, endDate);
    
    // Get planner items
    const plannerItems = await getPlannerItemsByDateRange(accountId, startDate, endDate);
    
    // Format planner items to match assignment structure
    const formattedPlannerItems = plannerItems.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        dueDate: item.dueDate,
        source: 'planner',
        category: item.category,
        status: item.status,
        isRecurring: item.isRecurring,
        recurringPattern: item.recurringPattern
    }));
    
    // Combine and sort by due date
    const allItems = [...assignments, ...formattedPlannerItems];
    allItems.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    return allItems;
};

module.exports = {
    // Assignment functions
    getAssignments,
    getAssignmentById,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    
    // Task functions
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    
    // Study session functions
    getStudySessions,
    createStudySession,
    
    // Course functions
    getCourses,
    
    // Stats
    getAcademicStats,
    
    // Status values
    STATUS_VALUES,

    // Weekly Planner functions
    getPlannerItemsByDateRange,
    getPlannerItemById,
    createPlannerItem,
    updatePlannerItem,
    deletePlannerItem,
    getAssignmentsForPlanner,
    getWeeklyPlanner
};
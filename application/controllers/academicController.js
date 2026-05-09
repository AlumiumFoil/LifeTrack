// controllers/academicController.js
// Handles business logic for academic features

const academicModel = require('../models/academicModel');

/**
 * Valid categories for planner items
 */
const VALID_CATEGORIES = ['Academic', 'Wellness', 'Productivity', 'Miscellaneous'];

/**
 * Valid status values for planner items
 */
const VALID_PLANNER_STATUSES = ['pending', 'completed'];

/**
 * Valid recurring patterns
 */
const VALID_RECURRING_PATTERNS = ['daily', 'weekly', 'monthly'];

/**
 * Helper: Validate assignment status
 * @param {string} status - Status to validate
 * @returns {boolean} True if valid
 */
const isValidAssignmentStatus = (status) => {
    const validStatuses = ['not started', 'in progress', 'completed', 'graded'];
    return !status || validStatuses.includes(status.toLowerCase());
};

/**
 * Helper: Validate task status
 * @param {string} status - Status to validate
 * @returns {boolean} True if valid
 */
const isValidTaskStatus = (status) => {
    const validStatuses = ['not started', 'in progress', 'completed'];
    return !status || validStatuses.includes(status.toLowerCase());
};

/**
 * Helper: Validate that course name exists in user's courses
 * @param {number} accountId - User's account ID
 * @param {string} courseName - Course name to validate
 * @returns {Promise<boolean>} True if course exists
 */
const validateCourseName = async (accountId, courseName) => {
    if (!courseName) return true; // Allow null/empty course name
    
    const courses = await academicModel.getUserCourses(accountId);
    return courses.some(course => course.courseTitle === courseName);
};

/**
 * Get all assignments for authenticated user
 * Requires authentication
 * GET /api/academic/assignments
 * Query param: status (optional) - filter by 'Upcoming', 'Submitted', 'Graded'
 * Output: { success, assignments, stats, courses }
 */
const getAssignments = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const assignments = await academicModel.getAssignments(accountId);
        const stats = await academicModel.getAcademicStats(accountId);
        const courses = await academicModel.getUserCourses(accountId);
        
        // Apply status filter if provided
        const filterStatus = req.query.status;
        if (filterStatus && filterStatus !== 'all') {
            let filteredAssignments = [...assignments];
            if (filterStatus === 'Upcoming') {
                filteredAssignments = assignments.filter(a => a.status === 'in progress' || a.status === 'not started');
            } else if (filterStatus === 'Submitted') {
                filteredAssignments = assignments.filter(a => a.status === 'completed');
            } else if (filterStatus === 'Graded') {
                filteredAssignments = assignments.filter(a => a.status === 'graded');
            }
            
            return res.json({
                success: true,
                assignments: filteredAssignments,
                stats: stats.assignments,
                courses
            });
        }
        
        res.json({
            success: true,
            assignments,
            stats: stats.assignments,
            courses
        });
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching assignments'
        });
    }
};

/**
 * Get a single assignment by ID
 * Requires authentication
 * GET /api/academic/assignments/:id
 * Output: { success, assignment }
 */
const getAssignmentById = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const assignmentId = req.params.id;
        
        const assignment = await academicModel.getAssignmentById(assignmentId, accountId);
        
        if (!assignment) {
            return res.status(404).json({
                success: false,
                error: 'Assignment not found'
            });
        }
        
        res.json({
            success: true,
            assignment
        });
    } catch (error) {
        console.error('Get assignment by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching the assignment'
        });
    }
};

/**
 * Create a new assignment
 * Requires authentication
 * POST /api/academic/assignments
 * Input: { title, description, courseName, status, dueDate }
 * Output: { success, message, assignmentId }
 */
const createAssignment = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const { title, description, courseName, status, dueDate } = req.body;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Assignment title is required'
            });
        }
        
        if (title.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Assignment title must not exceed 255 characters'
            });
        }
        
        if (status && !isValidAssignmentStatus(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Allowed: not started, in progress, completed, graded'
            });
        }

        if (courseName) {
            const courseExists = await validateCourseName(accountId, courseName);
            if (!courseExists) {
                return res.status(400).json({
                    success: false,
                    error: `Course "${courseName}" not found. Please create the course first or select from existing courses.`
                });
            }
        }
        
        const assignmentId = await academicModel.createAssignment(accountId, {
            title: title.trim(),
            description: description ? description.trim() : null,
            courseName: courseName ? courseName.trim() : null,
            status: status ? status.toLowerCase() : 'not started',
            dueDate: dueDate || null
        });
        
        res.status(201).json({
            success: true,
            message: 'Assignment created successfully',
            assignmentId: assignmentId
        });
    } catch (error) {
        console.error('Create assignment error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while creating the assignment'
        });
    }
};

/**
 * Update an existing assignment
 * Requires authentication
 * PUT /api/academic/assignments/:id
 * Input: { title, description, courseName, status, dueDate } (all optional)
 * Output: { success, message }
 */
const updateAssignment = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const assignmentId = req.params.id;
        const { title, description, courseName, status, dueDate } = req.body;
        
        const existingAssignment = await academicModel.getAssignmentById(assignmentId, accountId);
        if (!existingAssignment) {
            return res.status(404).json({
                success: false,
                error: 'Assignment not found'
            });
        }
        
        if (title !== undefined && title.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Assignment title must not exceed 255 characters'
            });
        }
        
        if (status && !isValidAssignmentStatus(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Allowed: not started, in progress, completed, graded'
            });
        }

        if (courseName) {
            const courseExists = await validateCourseName(accountId, courseName);
            if (!courseExists) {
                return res.status(400).json({
                    success: false,
                    error: `Course "${courseName}" not found. Please create the course first or select from existing courses.`
                });
            }
        }
        
        await academicModel.updateAssignment(assignmentId, accountId, {
            title: title !== undefined ? title.trim() : undefined,
            description: description !== undefined ? (description ? description.trim() : null) : undefined,
            courseName: courseName !== undefined ? (courseName ? courseName.trim() : null) : undefined,
            status: status !== undefined ? status.toLowerCase() : undefined,
            dueDate: dueDate !== undefined ? dueDate : undefined
        });
        
        res.json({
            success: true,
            message: 'Assignment updated successfully'
        });
    } catch (error) {
        console.error('Update assignment error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while updating the assignment'
        });
    }
};

/**
 * Delete an assignment
 * Requires authentication
 * DELETE /api/academic/assignments/:id
 * Output: { success, message }
 */
const deleteAssignment = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const assignmentId = req.params.id;
        
        const deleted = await academicModel.deleteAssignment(assignmentId, accountId);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Assignment not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Assignment deleted successfully'
        });
    } catch (error) {
        console.error('Delete assignment error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while deleting the assignment'
        });
    }
};

/**
 * Get all tasks for authenticated user
 * Requires authentication
 * GET /api/academic/tasks
 * Output: { success, tasks }
 */
const getTasks = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const tasks = await academicModel.getTasks(accountId);
        
        res.json({
            success: true,
            tasks
        });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching tasks'
        });
    }
};

/**
 * Get a single task by ID
 * Requires authentication
 * GET /api/academic/tasks/:id
 * Output: { success, task }
 */
const getTaskById = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const taskId = req.params.id;
        
        const task = await academicModel.getTaskById(taskId, accountId);
        
        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }
        
        res.json({
            success: true,
            task
        });
    } catch (error) {
        console.error('Get task by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching the task'
        });
    }
};

/**
 * Create a new task
 * Requires authentication
 * POST /api/academic/tasks
 * Input: { title, description, status, priority, dueDate }
 * Output: { success, message, taskId }
 */
const createTask = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const { title, description, status, priority, dueDate } = req.body;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Task title is required'
            });
        }
        
        if (title.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Task title must not exceed 255 characters'
            });
        }
        
        if (status && !isValidTaskStatus(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Allowed: not started, in progress, completed'
            });
        }
        
        const taskId = await academicModel.createTask(accountId, {
            title: title.trim(),
            description: description ? description.trim() : null,
            status: status ? status.toLowerCase() : 'not started',
            priority: priority || null,
            dueDate: dueDate || null
        });
        
        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            taskId: taskId
        });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while creating the task'
        });
    }
};

/**
 * Update an existing task
 * Requires authentication
 * PUT /api/academic/tasks/:id
 * Input: { title, description, status, priority, dueDate } (all optional)
 * Output: { success, message }
 */
const updateTask = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const taskId = req.params.id;
        const { title, description, status, priority, dueDate } = req.body;
        
        if (title !== undefined && title.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Task title must not exceed 255 characters'
            });
        }
        
        if (status && !isValidTaskStatus(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Allowed: not started, in progress, completed'
            });
        }
        
        await academicModel.updateTask(taskId, accountId, {
            title: title !== undefined ? title.trim() : undefined,
            description: description !== undefined ? (description ? description.trim() : null) : undefined,
            status: status !== undefined ? status.toLowerCase() : undefined,
            priority: priority !== undefined ? priority : undefined,
            dueDate: dueDate !== undefined ? dueDate : undefined
        });
        
        res.json({
            success: true,
            message: 'Task updated successfully'
        });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while updating the task'
        });
    }
};

/**
 * Delete a task
 * Requires authentication
 * DELETE /api/academic/tasks/:id
 * Output: { success, message }
 */
const deleteTask = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const taskId = req.params.id;
        
        const deleted = await academicModel.deleteTask(taskId, accountId);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while deleting the task'
        });
    }
};

/**
 * Get all study sessions for authenticated user
 * Requires authentication
 * GET /api/academic/study-sessions
 * Output: { success, studySessions }
 */
const getStudySessions = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const studySessions = await academicModel.getStudySessions(accountId);
        
        res.json({
            success: true,
            studySessions
        });
    } catch (error) {
        console.error('Get study sessions error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching study sessions'
        });
    }
};

/**
 * Create a new study session
 * Requires authentication
 * POST /api/academic/study-sessions
 * Input: { courseName, topic, sessionDate, durationMinutes, notes }
 * Output: { success, message, sessionId }
 */
const createStudySession = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const { courseName, topic, sessionDate, durationMinutes, notes } = req.body;
        
        if (!courseName || courseName.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Course name is required'
            });
        }
        
        if (durationMinutes !== undefined && (durationMinutes < 1 || durationMinutes > 1440)) {
            return res.status(400).json({
                success: false,
                error: 'Duration must be between 1 and 1440 minutes'
            });
        }
        
        const sessionId = await academicModel.createStudySession(accountId, {
            courseName: courseName.trim(),
            topic: topic ? topic.trim() : null,
            sessionDate: sessionDate || null,
            durationMinutes: durationMinutes || null,
            notes: notes ? notes.trim() : null
        });
        
        res.status(201).json({
            success: true,
            message: 'Study session logged successfully',
            sessionId: sessionId
        });
    } catch (error) {
        console.error('Create study session error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while logging the study session'
        });
    }
};

/**
 * Get academic statistics for authenticated user
 * Requires authentication
 * GET /api/academic/stats
 * Output: { success, stats }
 */
const getAcademicStats = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const stats = await academicModel.getAcademicStats(accountId);
        
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Get academic stats error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching statistics'
        });
    }
};

/**
 * Get start and end dates for a week based on a given date
 * @param {string} date - Reference date (YYYY-MM-DD)
 * @returns {object} { startDate, endDate }
 */
const getWeekRange = (date) => {
    const refDate = new Date(`${date}T00:00:00`);
    const dayOfWeek = refDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate start of the week (Sunday)
    const startDate = new Date(refDate);
    startDate.setDate(refDate.getDate() - dayOfWeek);
    
    // Calculate end of the week (Saturday)
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
    };
};

/**
 * Get weekly planner
 * Requires authentication
 * GET /api/academic/weekly-planner
 * Query param: weekStart (optional, YYYY-MM-DD) - defaults to current week
 * Output: { success, weekStart, weekEnd, items }
 */
const getWeeklyPlanner = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        let { weekStart } = req.query;
        
        // If no weekStart provided, use current week
        if (!weekStart) {
            const today = new Date().toISOString().split('T')[0];
            const range = getWeekRange(today);
            weekStart = range.startDate;
        }
        
        const range = getWeekRange(weekStart);
        
        const items = await academicModel.getWeeklyPlanner(accountId, range.startDate, range.endDate);
        
        res.json({
            success: true,
            weekStart: range.startDate,
            weekEnd: range.endDate,
            items
        });
    } catch (error) {
        console.error('Get weekly planner error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching weekly planner'
        });
    }
};

/**
 * Get all planner items
 * Requires authentication
 * GET /api/academic/planner-items
 * Query params: 
 *   - startDate (optional, YYYY-MM-DD) - defaults to current week start (Sunday)
 *   - endDate (optional, YYYY-MM-DD) - defaults to current week end (Saturday)
 *   - category (optional) - filter by category
 * Output: { success, items }
 */
const getPlannerItems = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        let { startDate, endDate, category } = req.query;
        
        // If no dates provided, default to current week
        if (!startDate || !endDate) {
            const today = new Date().toISOString().split('T')[0];
            const weekRange = getWeekRange(today);
            startDate = weekRange.startDate;
            endDate = weekRange.endDate;
        }
        
        let items = await academicModel.getPlannerItemsByDateRange(accountId, startDate, endDate);
        
        // Filter by category if provided
        if (category && VALID_CATEGORIES.includes(category)) {
            items = items.filter(item => item.category === category);
        }
        
        res.json({
            success: true,
            weekStart: startDate,
            weekEnd: endDate,
            items
        });
    } catch (error) {
        console.error('Get planner items error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching planner items'
        });
    }
};

/**
 * Get a single planner item by ID
 * Requires authentication
 * GET /api/academic/planner-items/:id
 * Output: { success, item }
 */
const getPlannerItemById = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const itemId = req.params.id;
        
        const item = await academicModel.getPlannerItemById(itemId, accountId);
        
        if (!item) {
            return res.status(404).json({
                success: false,
                error: 'Planner item not found'
            });
        }
        
        res.json({
            success: true,
            item
        });
    } catch (error) {
        console.error('Get planner item by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching the planner item'
        });
    }
};

/**
 * Create a new planner item
 * Requires authentication
 * POST /api/academic/planner-items
 * Input: { title, description, category, dueDate, status, isRecurring, recurringPattern, recurringEndDate }
 * Output: { success, message, itemId }
 */
const createPlannerItem = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const { 
            title, 
            description, 
            category, 
            dueDate, 
            status, 
            isRecurring, 
            recurringPattern, 
            recurringEndDate 
        } = req.body;
        
        // Validate required fields
        if (!title || title.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Title is required'
            });
        }
        
        if (title.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Title must not exceed 255 characters'
            });
        }
        
        if (!category) {
            return res.status(400).json({
                success: false,
                error: 'Category is required'
            });
        }
        
        if (!VALID_CATEGORIES.includes(category)) {
            return res.status(400).json({
                success: false,
                error: `Invalid category. Allowed: ${VALID_CATEGORIES.join(', ')}`
            });
        }
        
        if (!dueDate) {
            return res.status(400).json({
                success: false,
                error: 'Due date is required'
            });
        }
        
        if (status && !VALID_PLANNER_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Allowed: ${VALID_PLANNER_STATUSES.join(', ')}`
            });
        }
        
        if (isRecurring && recurringPattern && !VALID_RECURRING_PATTERNS.includes(recurringPattern)) {
            return res.status(400).json({
                success: false,
                error: `Invalid recurring pattern. Allowed: ${VALID_RECURRING_PATTERNS.join(', ')}`
            });
        }
        
        const itemId = await academicModel.createPlannerItem(accountId, {
            title: title.trim(),
            description: description ? description.trim() : null,
            category,
            dueDate,
            status: status || 'pending',
            isRecurring: isRecurring || false,
            recurringPattern: recurringPattern || null,
            recurringEndDate: recurringEndDate || null
        });
        
        res.status(201).json({
            success: true,
            message: 'Planner item created successfully',
            itemId: itemId
        });
    } catch (error) {
        console.error('Create planner item error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while creating the planner item'
        });
    }
};

/**
 * Update an existing planner item
 * Requires authentication
 * PUT /api/academic/planner-items/:id
 * Input: { title, description, category, dueDate, status, isRecurring, recurringPattern, recurringEndDate }
 * Output: { success, message }
 */
const updatePlannerItem = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const itemId = req.params.id;
        const { 
            title, 
            description, 
            category, 
            dueDate, 
            status, 
            isRecurring, 
            recurringPattern, 
            recurringEndDate 
        } = req.body;
        
        // Check if item exists
        const existingItem = await academicModel.getPlannerItemById(itemId, accountId);
        if (!existingItem) {
            return res.status(404).json({
                success: false,
                error: 'Planner item not found'
            });
        }
        
        // Validate title length if provided
        if (title !== undefined && title.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Title must not exceed 255 characters'
            });
        }
        
        // Validate category if provided
        if (category && !VALID_CATEGORIES.includes(category)) {
            return res.status(400).json({
                success: false,
                error: `Invalid category. Allowed: ${VALID_CATEGORIES.join(', ')}`
            });
        }
        
        // Validate status if provided
        if (status && !VALID_PLANNER_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Allowed: ${VALID_PLANNER_STATUSES.join(', ')}`
            });
        }
        
        // Validate recurring pattern if provided
        if (recurringPattern && !VALID_RECURRING_PATTERNS.includes(recurringPattern)) {
            return res.status(400).json({
                success: false,
                error: `Invalid recurring pattern. Allowed: ${VALID_RECURRING_PATTERNS.join(', ')}`
            });
        }
        
        await academicModel.updatePlannerItem(itemId, accountId, {
            title: title !== undefined ? title.trim() : undefined,
            description: description !== undefined ? (description ? description.trim() : null) : undefined,
            category: category !== undefined ? category : undefined,
            dueDate: dueDate !== undefined ? dueDate : undefined,
            status: status !== undefined ? status : undefined,
            isRecurring: isRecurring !== undefined ? isRecurring : undefined,
            recurringPattern: recurringPattern !== undefined ? recurringPattern : undefined,
            recurringEndDate: recurringEndDate !== undefined ? recurringEndDate : undefined
        });
        
        res.json({
            success: true,
            message: 'Planner item updated successfully'
        });
    } catch (error) {
        console.error('Update planner item error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while updating the planner item'
        });
    }
};

/**
 * Delete a planner item
 * Requires authentication
 * DELETE /api/academic/planner-items/:id
 * Output: { success, message }
 */
const deletePlannerItem = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const itemId = req.params.id;
        
        const deleted = await academicModel.deletePlannerItem(itemId, accountId);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Planner item not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Planner item deleted successfully'
        });
    } catch (error) {
        console.error('Delete planner item error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while deleting the planner item'
        });
    }
};

/**
 * Mark planner item as completed
 * Requires authentication
 * PATCH /api/academic/planner-items/:id/complete
 * Output: { success, message }
 */
const completePlannerItem = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const itemId = req.params.id;
        
        const existingItem = await academicModel.getPlannerItemById(itemId, accountId);
        if (!existingItem) {
            return res.status(404).json({
                success: false,
                error: 'Planner item not found'
            });
        }
        
        await academicModel.updatePlannerItem(itemId, accountId, { status: 'completed' });
        
        res.json({
            success: true,
            message: 'Planner item marked as completed'
        });
    } catch (error) {
        console.error('Complete planner item error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while completing the planner item'
        });
    }
};

/**
 * Get all courses for authenticated user
 * Requires authentication
 * GET /api/academic/courses
 * Output: { success, courses }
 */
const getUserCourses = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const courses = await academicModel.getUserCourses(accountId);
        
        res.json({
            success: true,
            courses
        });
    } catch (error) {
        console.error('Get user courses error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching courses'
        });
    }
};

/**
 * Get a single course by ID
 * GET /api/academic/courses/:id
 * Requires authentication
 * Output: { success, course }
 */
const getCourseById = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const courseId = req.params.id;
        
        const course = await academicModel.getCourseById(courseId, accountId);
        
        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }
        
        res.json({
            success: true,
            course
        });
    } catch (error) {
        console.error('Get course by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while fetching the course'
        });
    }
};

/**
 * Create a new course
 * Requires authentication
 * POST /api/academic/courses
 * Input: { courseCode, courseTitle, instructor, term, currentGrade }
 * Output: { success, message, courseId }
 */
const createCourse = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const { courseCode, courseTitle, instructor, term, currentGrade } = req.body;
        
        // Validate required fields
        if (!courseCode || courseCode.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Course code is required'
            });
        }
        
        if (courseCode.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Course code must not exceed 50 characters'
            });
        }
        
        if (!courseTitle || courseTitle.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Course title is required'
            });
        }
        
        if (courseTitle.length > 150) {
            return res.status(400).json({
                success: false,
                error: 'Course title must not exceed 150 characters'
            });
        }
        
        // Validate instructor name length if provided
        if (instructor && instructor.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Instructor name must not exceed 100 characters'
            });
        }
        
        // Validate term length if provided
        if (term && term.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Term must not exceed 50 characters'
            });
        }
        
        // Validate grade if provided (allow letter grades like A-, B+, or numbers)
        if (currentGrade && currentGrade.length > 10) {
            return res.status(400).json({
                success: false,
                error: 'Grade must not exceed 10 characters'
            });
        }

        // Check for duplicate course code
        const isDuplicate = await academicModel.isCourseCodeDuplicate(accountId, courseCode);
        if (isDuplicate) {
            return res.status(409).json({
                success: false,
                error: `Course with code "${courseCode}" already exists. Please use a different course code.`
            });
        }
        
        const courseId = await academicModel.createCourse(accountId, {
            courseCode: courseCode.trim().toUpperCase(),
            courseTitle: courseTitle.trim(),
            instructor: instructor || null,
            term: term || null,
            currentGrade: currentGrade || null
        });
        
        res.status(201).json({
            success: true,
            message: 'Course created successfully',
            courseId: courseId
        });
    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while creating the course'
        });
    }
};

/**
 * Update an existing course
 * Requires authentication
 * PUT /api/academic/courses/:id
 * Input: { courseCode, courseTitle, instructor, term, currentGrade } (all optional)
 * Output: { success, message }
 */
const updateCourse = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const courseId = req.params.id;
        const { courseCode, courseTitle, instructor, term, currentGrade } = req.body;
        
        const existingCourse = await academicModel.getCourseById(courseId, accountId);
        if (!existingCourse) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }
        
        // Validate course code length if provided
        if (courseCode !== undefined && courseCode.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Course code must not exceed 50 characters'
            });
        }
        
        // Validate course title length if provided
        if (courseTitle !== undefined && courseTitle.length > 150) {
            return res.status(400).json({
                success: false,
                error: 'Course title must not exceed 150 characters'
            });
        }
        
        // Validate instructor name length if provided
        if (instructor !== undefined && instructor.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Instructor name must not exceed 100 characters'
            });
        }
        
        // Validate term length if provided
        if (term !== undefined && term.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Term must not exceed 50 characters'
            });
        }
        
        // Validate grade length if provided
        if (currentGrade !== undefined && currentGrade.length > 10) {
            return res.status(400).json({
                success: false,
                error: 'Grade must not exceed 10 characters'
            });
        }
        
        await academicModel.updateCourse(courseId, accountId, {
            courseCode: courseCode !== undefined ? courseCode.trim().toUpperCase() : undefined,
            courseTitle: courseTitle !== undefined ? courseTitle.trim() : undefined,
            instructor: instructor !== undefined ? instructor : undefined,
            term: term !== undefined ? term : undefined,
            currentGrade: currentGrade !== undefined ? currentGrade : undefined
        });
        
        res.json({
            success: true,
            message: 'Course updated successfully'
        });
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while updating the course'
        });
    }
};

/**
 * Delete a course
 * Requires authentication
 * DELETE /api/academic/courses/:id
 * Output: { success, message }
 */
const deleteCourse = async (req, res) => {
    try {
        const accountId = req.user.account_id;
        const courseId = req.params.id;
        
        const deleted = await academicModel.deleteCourse(courseId, accountId);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Course deleted successfully'
        });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while deleting the course'
        });
    }
};

module.exports = {
    // Assignments
    getAssignments,
    getAssignmentById,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    
    // Tasks
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    
    // Study Sessions
    getStudySessions,
    createStudySession,
    
    // Stats
    getAcademicStats,

    // Weekly Planner
    getWeeklyPlanner,
    getPlannerItems,
    getPlannerItemById,
    createPlannerItem,
    updatePlannerItem,
    deletePlannerItem,
    completePlannerItem,

    // Course management
    getUserCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,

    // Valid values for Weekly Planner
    VALID_CATEGORIES,
    VALID_PLANNER_STATUSES,
    VALID_RECURRING_PATTERNS
};
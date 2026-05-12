// routes/academicRoutes.js
// Defines all academic-related API routes
// Routes are prefixed with /api/academic

const express = require('express');
const academicController = require('../controllers/academicController');
const { authenticateJWT } = require('../middleware/authenticate');

const router = express.Router();

// All academic routes require authentication
router.use(authenticateJWT);

/**
 * GET /api/academic/assignments
 * Get all assignments for authenticated user
 * Requires authentication
 * Output: { success, assignments }
 */
router.get('/assignments', academicController.getAssignments);

/**
 * GET /api/academic/assignments/:id
 * Get a single assignment by ID
 * Requires authentication
 * Output: { success, assignment }
 */
router.get('/assignments/:id', academicController.getAssignmentById);

/**
 * POST /api/academic/assignments
 * Create a new assignment
 * Requires authentication
 * Input: { title, description, courseName, status, dueDate }
 * Output: { success, message, assignmentId }
 */
router.post('/assignments', academicController.createAssignment);

/**
 * PUT /api/academic/assignments/:id
 * Update an existing assignment
 * Requires authentication
 * Input: { title, description, courseName, status, dueDate } (all optional)
 * Output: { success, message }
 */
router.put('/assignments/:id', academicController.updateAssignment);

/**
 * DELETE /api/academic/assignments/:id
 * Delete an assignment
 * Requires authentication
 * Output: { success, message }
 */
router.delete('/assignments/:id', academicController.deleteAssignment);

/**
 * GET /api/academic/tasks
 * Get all tasks for authenticated user
 * Requires authentication
 * Output: { success, tasks }
 */
router.get('/tasks', academicController.getTasks);

/**
 * GET /api/academic/tasks/:id
 * Get a single task by ID
 * Requires authentication
 * Output: { success, task }
 */
router.get('/tasks/:id', academicController.getTaskById);

/**
 * POST /api/academic/tasks
 * Create a new task
 * Requires authentication
 * Input: { title, description, status, priority, dueDate }
 * Output: { success, message, taskId }
 */
router.post('/tasks', academicController.createTask);

/**
 * PUT /api/academic/tasks/:id
 * Update an existing task
 * Requires authentication
 * Input: { title, description, status, priority, dueDate } (all optional)
 * Output: { success, message }
 */
router.put('/tasks/:id', academicController.updateTask);

/**
 * DELETE /api/academic/tasks/:id
 * Delete a task
 * Requires authentication
 * Output: { success, message }
 */
router.delete('/tasks/:id', academicController.deleteTask);

/**
 * GET /api/academic/study-sessions
 * Get all study sessions for authenticated user (last 50)
 * Requires authentication
 * Output: { success, studySessions }
 */
router.get('/study-sessions', academicController.getStudySessions);

/**
 * POST /api/academic/study-sessions
 * Log a new study session
 * Requires authentication
 * Input: { courseName, topic, sessionDate, durationMinutes, notes }
 * Output: { success, message, sessionId }
 */
router.post('/study-sessions', academicController.createStudySession);

/**
 * GET /api/academic/stats
 * Get academic statistics (assignment counts, task counts, total study minutes)
 * Requires authentication
 * Output: { success, stats }
 */
router.get('/stats', academicController.getAcademicStats);

/**
 * GET /api/academic/weekly-planner
 * Get weekly planner (assignments + planner items)
 * Query param: weekStart (optional, YYYY-MM-DD) - defaults to current week
 * Requires authentication
 * Output: { success, weekStart, weekEnd, items }
 */
router.get('/weekly-planner', academicController.getWeeklyPlanner);

/**
 * GET /api/academic/planner-items
 * Get all planner items for a date range
 * Query params: startDate, endDate (YYYY-MM-DD)
 * Requires authentication
 * Output: { success, items }
 */
router.get('/planner-items', academicController.getPlannerItems);

/**
 * GET /api/academic/planner-items/:id
 * Get a single planner item by ID
 * Requires authentication
 * Output: { success, item }
 */
router.get('/planner-items/:id', academicController.getPlannerItemById);

/**
 * POST /api/academic/planner-items
 * Create a new planner item
 * Requires authentication
 * Input: { title, description, category, dueDate, status, isRecurring, recurringPattern, recurringEndDate }
 * Output: { success, message, itemId }
 */
router.post('/planner-items', academicController.createPlannerItem);

/**
 * PUT /api/academic/planner-items/:id
 * Update an existing planner item
 * Requires authentication
 * Input: { title, description, category, dueDate, status, isRecurring, recurringPattern, recurringEndDate }
 * Output: { success, message }
 */
router.put('/planner-items/:id', academicController.updatePlannerItem);

/**
 * DELETE /api/academic/planner-items/:id
 * Delete a planner item
 * Requires authentication
 * Output: { success, message }
 */
router.delete('/planner-items/:id', academicController.deletePlannerItem);

/**
 * PATCH /api/academic/planner-items/:id/complete
 * Mark planner item as completed
 * Requires authentication
 * Output: { success, message }
 */
router.patch('/planner-items/:id/complete', academicController.completePlannerItem);

/**
 * GET /api/academic/courses
 * Get all courses for authenticated user
 * Requires authentication
 * Output: { success, courses }
 */
router.get('/courses', academicController.getUserCourses);

/**
 * GET /api/academic/courses/:id
 * Get a single course by ID
 * Requires authentication
 * Output: { success, course }
 */
router.get('/courses/:id', academicController.getCourseById);

/**
 * POST /api/academic/courses
 * Create a new course
 * Requires authentication
 * Input: { courseCode, courseTitle, instructor, term, currentGrade }
 * Output: { success, message, courseId }
 */
router.post('/courses', academicController.createCourse);

/**
 * PUT /api/academic/courses/:id
 * Update an existing course
 * Requires authentication
 * Input: { courseCode, courseTitle, instructor, term, currentGrade } (all optional)
 * Output: { success, message }
 */
router.put('/courses/:id', academicController.updateCourse);

/**
 * DELETE /api/academic/courses/:id
 * Delete a course
 * Requires authentication
 * Output: { success, message }
 */
router.delete('/courses/:id', academicController.deleteCourse);

module.exports = router;
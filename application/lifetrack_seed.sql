-- lifetrack seed data (run inside the target database)
-- example: USE team1_db_test;

-- roles
INSERT IGNORE INTO roles (role_name) VALUES
('guest'),
('college_student'),
('faculty_academic_program'),
('university_support_organization'),
('administrator');

-- demo users (hashes are placeholders, prefer creating demo users through /register)
INSERT INTO user_accounts (email, username, password_hash, account_status)
VALUES
('student1@sfsu.edu', 'student1', 'seed_hash_student1', 'active'),
('admin1@sfsu.edu', 'admin1', 'seed_hash_admin1', 'active')
ON DUPLICATE KEY UPDATE account_status=VALUES(account_status);

SET @student_id = (SELECT account_id FROM user_accounts WHERE username='student1' LIMIT 1);
SET @admin_id = (SELECT account_id FROM user_accounts WHERE username='admin1' LIMIT 1);

SET @student_role = (SELECT role_id FROM roles WHERE role_name='college_student' LIMIT 1);
SET @admin_role = (SELECT role_id FROM roles WHERE role_name='administrator' LIMIT 1);

INSERT IGNORE INTO user_roles (account_id, role_id) VALUES
(@student_id, @student_role),
(@admin_id, @admin_role);

INSERT INTO user_security_questions (account_id, question_text, answer_hash)
VALUES
(@student_id, 'What is the name of your first pet', 'seed_answer_hash_1')
ON DUPLICATE KEY UPDATE answer_hash=VALUES(answer_hash);

INSERT INTO user_accessibility_settings (account_id, theme_mode, text_size, high_contrast_enabled)
VALUES
(@student_id, 'dark', 'normal', 0)
ON DUPLICATE KEY UPDATE theme_mode=VALUES(theme_mode), text_size=VALUES(text_size);

INSERT INTO dashboards (account_id, last_viewed_at)
VALUES (@student_id, NOW())
ON DUPLICATE KEY UPDATE last_viewed_at=VALUES(last_viewed_at);

-- resources
DELETE FROM resource_tags;
DELETE FROM saved_items;
DELETE FROM resources;

INSERT INTO resources
(title, description, url, image_url, thumbnail_url, content_type, category, use_case, skill_area, is_non_ai, is_free, is_public)
VALUES
('Study Guide Workflow', 'A step by step workflow for building study guides before exams.', 'https://example.com/study-guide', 'https://placehold.co/600x400?text=Study+Guide', 'https://placehold.co/200x150?text=Study+Guide', 'workflow', 'academic', 'studying', 'technical', 1, 1, 1),
('Active Recall Checklist', 'A checklist to use active recall while studying.', 'https://example.com/active-recall', 'https://placehold.co/600x400?text=Active+Recall', 'https://placehold.co/200x150?text=Active+Recall', 'guide', 'academic', 'studying', 'technical', 1, 1, 1),
('Spaced Repetition Routine', 'A simple spaced repetition routine for weekly review.', 'https://example.com/spaced', 'https://placehold.co/600x400?text=Spaced+Repetition', 'https://placehold.co/200x150?text=Spaced+Repetition', 'workflow', 'academic', 'studying', 'technical', 1, 1, 1),
('Note Taking Template', 'A clean note taking template for lectures and readings.', 'https://example.com/notes', 'https://placehold.co/600x400?text=Notes+Template', 'https://placehold.co/200x150?text=Notes+Template', 'template', 'academic', 'studying', 'communication', 1, 1, 1),
('Flashcard Template', 'A simple flashcard template for key terms and concepts.', 'https://example.com/flashcards', 'https://placehold.co/600x400?text=Flashcards', 'https://placehold.co/200x150?text=Flashcards', 'template', 'academic', 'studying', 'technical', 1, 1, 1),

('Wellness Check In Module', 'A short module for stress management and weekly check ins.', 'https://example.com/wellness', 'https://placehold.co/600x400?text=Wellness+Module', 'https://placehold.co/200x150?text=Wellness+Module', 'module', 'wellness', 'mental wellness', 'health', 1, 1, 1),
('Breathing Reset Guide', 'A quick guide for breathing exercises during stress.', 'https://example.com/breathe', 'https://placehold.co/600x400?text=Breathing', 'https://placehold.co/200x150?text=Breathing', 'guide', 'wellness', 'mental wellness', 'health', 1, 1, 1),
('Sleep Routine Workflow', 'A simple sleep routine workflow for busy weeks.', 'https://example.com/sleep', 'https://placehold.co/600x400?text=Sleep+Routine', 'https://placehold.co/200x150?text=Sleep+Routine', 'workflow', 'wellness', 'mental wellness', 'health', 1, 1, 1),
('Weekly Reflection Prompts', 'Prompts to help reflect on progress and challenges.', 'https://example.com/prompts', 'https://placehold.co/600x400?text=Reflection+Prompts', 'https://placehold.co/200x150?text=Reflection+Prompts', 'guide', 'wellness', 'mental wellness', 'communication', 1, 1, 1),

('Project Planning Template', 'A template that breaks a project into milestones and tasks.', 'https://example.com/project-plan', 'https://placehold.co/600x400?text=Project+Plan', 'https://placehold.co/200x150?text=Project+Plan', 'template', 'productivity', 'project management', 'leadership', 1, 1, 1),
('Time Blocking Tool', 'A simple tool guide for time blocking and scheduling.', 'https://example.com/time-blocking', 'https://placehold.co/600x400?text=Time+Blocking', 'https://placehold.co/200x150?text=Time+Blocking', 'tool', 'productivity', 'productivity', 'technical', 1, 1, 1),
('Pomodoro Workflow', 'A workflow for using pomodoro sessions effectively.', 'https://example.com/pomodoro', 'https://placehold.co/600x400?text=Pomodoro', 'https://placehold.co/200x150?text=Pomodoro', 'workflow', 'productivity', 'productivity', 'technical', 1, 1, 1),
('Weekly Planning Module', 'A module that helps plan the week and prioritize tasks.', 'https://example.com/weekly-plan', 'https://placehold.co/600x400?text=Weekly+Plan', 'https://placehold.co/200x150?text=Weekly+Plan', 'module', 'productivity', 'productivity', 'leadership', 1, 1, 1),
('Distraction Control Tips', 'Tips to reduce distractions while working or studying.', 'https://example.com/focus', 'https://placehold.co/600x400?text=Focus+Tips', 'https://placehold.co/200x150?text=Focus+Tips', 'guide', 'productivity', 'productivity', 'communication', 1, 1, 1),

('Community Study Group Post', 'A public post to find study buddies for a class.', 'https://example.com/community-study', 'https://placehold.co/600x400?text=Study+Group', 'https://placehold.co/200x150?text=Study+Group', 'community_shared', 'academic', 'studying', 'communication', 1, 1, 1),
('Community Accountability Partner', 'A community post to find an accountability partner.', 'https://example.com/accountability', 'https://placehold.co/600x400?text=Accountability', 'https://placehold.co/200x150?text=Accountability', 'community_shared', 'productivity', 'productivity', 'communication', 1, 1, 1),

('Resume Starter Template', 'A clean resume template with sections and tips.', 'https://example.com/resume', 'https://placehold.co/600x400?text=Resume', 'https://placehold.co/200x150?text=Resume', 'template', 'career', 'job preparation', 'communication', 1, 1, 1),
('Portfolio Checklist', 'A checklist to build a simple portfolio site.', 'https://example.com/portfolio', 'https://placehold.co/600x400?text=Portfolio', 'https://placehold.co/200x150?text=Portfolio', 'guide', 'career', 'job preparation', 'technical', 1, 1, 1),
('Interview Prep Workflow', 'A workflow for preparing for interviews.', 'https://example.com/interview', 'https://placehold.co/600x400?text=Interview+Prep', 'https://placehold.co/200x150?text=Interview+Prep', 'workflow', 'career', 'job preparation', 'communication', 1, 1, 1);

-- tags
INSERT INTO resource_tags (resource_id, tag)
SELECT resource_id, 'study' FROM resources WHERE category='academic';

INSERT INTO resource_tags (resource_id, tag)
SELECT resource_id, 'wellness' FROM resources WHERE category='wellness';

INSERT INTO resource_tags (resource_id, tag)
SELECT resource_id, 'productivity' FROM resources WHERE category='productivity';

INSERT INTO resource_tags (resource_id, tag)
SELECT resource_id, 'template' FROM resources WHERE content_type='template';

INSERT INTO resource_tags (resource_id, tag)
SELECT resource_id, 'module' FROM resources WHERE content_type='module';

-- goals, project, milestones for the demo student
DELETE FROM reflection_links;
DELETE FROM reflections;
DELETE FROM milestones;
DELETE FROM project_goals;
DELETE FROM projects;
DELETE FROM goals;
DELETE FROM notifications;

INSERT INTO goals (account_id, title, description, status, target_date, notes, category)
VALUES
(@student_id, 'Build a study routine', 'Create a weekly study plan and follow it.', 'in progress', DATE_ADD(CURDATE(), INTERVAL 21 DAY), 'Use active recall and spaced repetition.', 'academic'),
(@student_id, 'Improve wellness habits', 'Do a weekly check in and reduce stress.', 'started', DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Try breathing and sleep routine.', 'wellness'),
(@student_id, 'Plan a project timeline', 'Break a project into milestones.', 'not started', DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Use the project planning template.', 'productivity');

SET @goal1 = (SELECT goal_id FROM goals WHERE account_id=@student_id ORDER BY goal_id ASC LIMIT 1);
SET @goal2 = (SELECT goal_id FROM goals WHERE account_id=@student_id ORDER BY goal_id ASC LIMIT 1 OFFSET 1);
SET @goal3 = (SELECT goal_id FROM goals WHERE account_id=@student_id ORDER BY goal_id ASC LIMIT 1 OFFSET 2);

INSERT INTO projects (account_id, title, description, status)
VALUES (@student_id, 'Midterm prep plan', 'A short plan to prep for exams.', 'in progress');

SET @proj1 = (SELECT project_id FROM projects WHERE account_id=@student_id ORDER BY project_id ASC LIMIT 1);

INSERT IGNORE INTO project_goals (project_id, goal_id) VALUES
(@proj1, @goal1),
(@proj1, @goal3);

INSERT INTO milestones (project_id, title, description, status, due_date, sort_order)
VALUES
(@proj1, 'Create study guide', 'Create a study guide for key topics.', 'in progress', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 1),
(@proj1, 'Practice problems', 'Do practice sets and review mistakes.', 'not started', DATE_ADD(CURDATE(), INTERVAL 10 DAY), 2),
(@proj1, 'Final review day', 'Do a full review and rest.', 'not started', DATE_ADD(CURDATE(), INTERVAL 14 DAY), 3);

INSERT INTO reflections (account_id, title, body_text)
VALUES
(@student_id, 'Week check in', 'I stayed consistent with study sessions and noticed better recall.'),
(@student_id, 'Wellness note', 'Breathing resets helped during stress, sleep still needs work.');

SET @ref1 = (SELECT reflection_id FROM reflections WHERE account_id=@student_id ORDER BY reflection_id ASC LIMIT 1);
SET @ref2 = (SELECT reflection_id FROM reflections WHERE account_id=@student_id ORDER BY reflection_id ASC LIMIT 1 OFFSET 1);

INSERT IGNORE INTO reflection_links (reflection_id, linked_type, linked_id) VALUES
(@ref1, 'goal', @goal1),
(@ref1, 'project', @proj1),
(@ref2, 'goal', @goal2);

-- saved items for the student
SET @r_study = (SELECT resource_id FROM resources WHERE title='Study Guide Workflow' LIMIT 1);
SET @r_well = (SELECT resource_id FROM resources WHERE title='Wellness Check In Module' LIMIT 1);
SET @r_plan = (SELECT resource_id FROM resources WHERE title='Project Planning Template' LIMIT 1);

INSERT INTO saved_items (account_id, resource_id, collection_name, linked_type, linked_id)
VALUES
(@student_id, @r_study, 'study', 'goal', @goal1),
(@student_id, @r_well, 'wellness', 'goal', @goal2),
(@student_id, @r_plan, 'productivity', 'project', @proj1);

-- notifications
INSERT INTO notifications (account_id, notification_type, message_text, is_read)
VALUES
(@student_id, 'milestone_due', 'Milestone Create study guide is due soon.', 0),
(@student_id, 'saved_item', 'You saved Project Planning Template to productivity.', 0);

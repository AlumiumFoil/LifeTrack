-- lifetrack schema (run inside the target database)
-- example: USE team1_db_test;

CREATE TABLE IF NOT EXISTS user_accounts (
  account_id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  account_status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_security_questions (
  question_id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  question_text VARCHAR(255) NOT NULL,
  answer_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usq_account FOREIGN KEY (account_id)
    REFERENCES user_accounts(account_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_roles (
  account_id INT NOT NULL,
  role_id INT NOT NULL,
  PRIMARY KEY (account_id, role_id),
  CONSTRAINT fk_ur_account FOREIGN KEY (account_id)
    REFERENCES user_accounts(account_id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id)
    REFERENCES roles(role_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_accessibility_settings (
  settings_id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL UNIQUE,
  theme_mode VARCHAR(50) NOT NULL DEFAULT 'system',
  text_size VARCHAR(50) NOT NULL DEFAULT 'normal',
  high_contrast_enabled TINYINT(1) NOT NULL DEFAULT 0,
  font_choice VARCHAR(100) NULL,
  color_blind_mode VARCHAR(50) NULL,
  CONSTRAINT fk_uas_account FOREIGN KEY (account_id)
    REFERENCES user_accounts(account_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dashboards (
  dashboard_id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL UNIQUE,
  last_viewed_at TIMESTAMP NULL,
  CONSTRAINT fk_dash_account FOREIGN KEY (account_id)
    REFERENCES user_accounts(account_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS goals (
  goal_id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'not started',
  target_date DATE NULL,
  notes TEXT NULL,
  category VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_goals_account FOREIGN KEY (account_id)
    REFERENCES user_accounts(account_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  project_id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'not started',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_projects_account FOREIGN KEY (account_id)
    REFERENCES user_accounts(account_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_goals (
  project_id INT NOT NULL,
  goal_id INT NOT NULL,
  PRIMARY KEY (project_id, goal_id),
  CONSTRAINT fk_pg_project FOREIGN KEY (project_id)
    REFERENCES projects(project_id) ON DELETE CASCADE,
  CONSTRAINT fk_pg_goal FOREIGN KEY (goal_id)
    REFERENCES goals(goal_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS milestones (
  milestone_id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'not started',
  due_date DATE NULL,
  sort_order INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_milestones_project FOREIGN KEY (project_id)
    REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reflections (
  reflection_id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  title VARCHAR(255) NULL,
  body_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reflections_account FOREIGN KEY (account_id)
    REFERENCES user_accounts(account_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reflection_links (
  reflection_id INT NOT NULL,
  linked_type VARCHAR(50) NOT NULL,
  linked_id INT NOT NULL,
  PRIMARY KEY (reflection_id, linked_type, linked_id),
  CONSTRAINT fk_rl_reflection FOREIGN KEY (reflection_id)
    REFERENCES reflections(reflection_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resources (
  resource_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  url VARCHAR(500) NULL,
  image_url VARCHAR(500) NULL,
  thumbnail_url VARCHAR(500) NULL,
  media_path VARCHAR(500) NULL,
  content_type VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  use_case VARCHAR(100) NULL,
  skill_area VARCHAR(100) NULL,
  is_non_ai TINYINT(1) NOT NULL DEFAULT 1,
  is_free TINYINT(1) NOT NULL DEFAULT 1,
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  created_by_account_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_resources_creator FOREIGN KEY (created_by_account_id)
    REFERENCES user_accounts(account_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS resource_tags (
  resource_id INT NOT NULL,
  tag VARCHAR(100) NOT NULL,
  PRIMARY KEY (resource_id, tag),
  CONSTRAINT fk_rt_resource FOREIGN KEY (resource_id)
    REFERENCES resources(resource_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_items (
  saved_item_id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  resource_id INT NOT NULL,
  collection_name VARCHAR(100) NULL,
  linked_type VARCHAR(50) NULL,
  linked_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_saved_account FOREIGN KEY (account_id)
    REFERENCES user_accounts(account_id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_resource FOREIGN KEY (resource_id)
    REFERENCES resources(resource_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  notification_type VARCHAR(100) NOT NULL,
  message_text VARCHAR(500) NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_account FOREIGN KEY (account_id)
    REFERENCES user_accounts(account_id) ON DELETE CASCADE
);

-- indexes for search and filtering
CREATE INDEX idx_resources_public ON resources(is_public);
CREATE INDEX idx_resources_category ON resources(category);
CREATE INDEX idx_resources_content_type ON resources(content_type);
CREATE INDEX idx_resources_created_at ON resources(created_at);
CREATE INDEX idx_resources_category_type ON resources(category, content_type);

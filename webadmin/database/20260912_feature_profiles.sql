-- Create new table for Features (main categories)
CREATE TABLE IF NOT EXISTS features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  feature_key VARCHAR(100) NOT NULL UNIQUE,
  feature_name VARCHAR(200) NOT NULL,
  section VARCHAR(100) NOT NULL,
  description TEXT,
  created_by INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INT,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_section (section),
  INDEX idx_feature_key (feature_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create new table for Feature Profiles (options for each feature)
CREATE TABLE IF NOT EXISTS feature_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  feature_key VARCHAR(100) NOT NULL,
  profile_key VARCHAR(100) NOT NULL,
  profile_name VARCHAR(200) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_by INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INT,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_feature_profile (feature_key, profile_key),
  FOREIGN KEY (feature_key) REFERENCES features(feature_key) ON DELETE CASCADE,
  INDEX idx_feature_key (feature_key),
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit log table for tracking changes
CREATE TABLE IF NOT EXISTS feature_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action ENUM('CREATE', 'UPDATE', 'DELETE', 'ENABLE', 'DISABLE') NOT NULL,
  entity_type ENUM('FEATURE', 'PROFILE') NOT NULL,
  entity_key VARCHAR(100) NOT NULL,
  old_value JSON,
  new_value JSON,
  changed_by INT NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  INDEX idx_entity (entity_type, entity_key),
  INDEX idx_changed_by (changed_by),
  INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

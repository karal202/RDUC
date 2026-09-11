-- Chạy file này một lần trên database production hiện có.
CREATE TABLE IF NOT EXISTS feature_file_policies (
    feature_key VARCHAR(100) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by INT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_feature_policy_admin
      FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL
);

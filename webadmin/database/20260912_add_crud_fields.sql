-- Add CRUD fields to feature_file_policies table
ALTER TABLE feature_file_policies 
ADD COLUMN section VARCHAR(100) NOT NULL DEFAULT 'General',
ADD COLUMN file_path VARCHAR(500) NOT NULL DEFAULT '',
ADD COLUMN created_by INT,
ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows with default section and file_path
UPDATE feature_file_policies 
SET section = 'General', 
    file_path = '',
    created_at = updated_at
WHERE section IS NULL OR file_path IS NULL OR file_path = '';

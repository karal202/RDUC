-- Migration: Populate feature_file_policies with legacy data
-- Run this after adding the new columns with 20260912_add_crud_fields.sql

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('bios-bat', 'BIOS', 'BIOS/bios.bat', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('ntfs-bat', 'BIOS / NTFS', 'BIOS/NTFS.bat', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('network-full-tweaks', 'Network', 'Network/Network Tweaks.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('network-fast-send', 'Network', 'Network/FastSendDatagramThreshold.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('mouse-queue-10', 'Input Lag', 'Input Lag/Mouse/DataQueueSize/10 Decimal.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('mouse-queue-20', 'Input Lag', 'Input Lag/Mouse/DataQueueSize/20 Decimal.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('mouse-queue-22', 'Input Lag', 'Input Lag/Mouse/DataQueueSize/22 Decimal.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('mouse-queue-25', 'Input Lag', 'Input Lag/Mouse/DataQueueSize/25 Decimal.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('mouse-queue-default', 'Input Lag', 'Input Lag/Mouse/DataQueueSize/Default Windows.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('keyboard-queue-10', 'Input Lag', 'Input Lag/Keyboard/DataQueueSize/10 Decimal.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('keyboard-queue-15', 'Input Lag', 'Input Lag/Keyboard/DataQueueSize/15 Decimal.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('keyboard-queue-20', 'Input Lag', 'Input Lag/Keyboard/DataQueueSize/20 Decimal.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('keyboard-queue-22', 'Input Lag', 'Input Lag/Keyboard/DataQueueSize/22 Decimal.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('keyboard-queue-25', 'Input Lag', 'Input Lag/Keyboard/DataQueueSize/25 Decimal.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('keyboard-queue-default', 'Input Lag', 'Input Lag/Keyboard/DataQueueSize/Default Windows.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('msi-utility', 'Tools & Cache', 'Tool&cache/MSI Utility/MSI Utility V3.exe', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('windows-settings-tweaks', 'Tools & Cache', 'Tool&cache/Classic Right Click Menu/Windows 11.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('dawa-cleaner', 'Tools & Cache', 'Tool&cache/Clean/Clear.bat', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('ram-optimization', 'Optimize', 'Optimizer/Ram Optimization/Reset to Default.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('dawa-power-plan', 'Optimize', 'Optimizer/4. PowerPlan/Dawa_Utilmate.pow', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('win32-priority', 'Optimize', 'Optimizer/8. Win32Priority/26 hex.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('restore-gamer-services', 'Restore', 'Restore/Disable Services For Gamers Restore.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('restore-professional-services', 'Restore', 'Restore/Disable Services For Professionals Restore.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('dawa-gaming-boost', 'Optimize', '(internal)', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('dawa-cleaner', 'Tools & Cache', '(internal)', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('win-disable-hibernate', 'Windows Tweaks', '(internal)', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('win-enable-hibernate', 'Windows Tweaks', '(internal)', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('win-disable-fso-gamebar', 'Windows Tweaks', '(internal)', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('win-enable-fso-gamebar', 'Windows Tweaks', '(internal)', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('win-disable-telemetry', 'Windows Tweaks', '(internal)', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('win-enable-telemetry', 'Windows Tweaks', '(internal)', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('win-disable-superfetch', 'Windows Tweaks', '(internal)', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('win-enable-superfetch', 'Windows Tweaks', '(internal)', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('win-disable-transparency', 'Windows Tweaks', '(internal)', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('win-enable-transparency', 'Windows Tweaks', '(internal)', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) 
   VALUES ('mouse-disable-acceleration', 'Input Lag', 'Input Lag/Reduce Input Lag/System.reg', true, NOW(), NOW()) 
   ON DUPLICATE KEY UPDATE section = VALUES(section), file_path = VALUES(file_path);

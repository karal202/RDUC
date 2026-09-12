-- Populate initial features and profiles based on existing Electron app functionality

-- RAM Optimization Feature
INSERT INTO features (feature_key, feature_name, section, description) 
VALUES ('ram-optimization', 'RAM Profile Optimization', 'Optimize', 'Chọn profile RAM tương ứng với dung lượng RAM của bạn')
ON DUPLICATE KEY UPDATE feature_name = VALUES(feature_name), section = VALUES(section), description = VALUES(description);

-- RAM Profiles
INSERT INTO feature_profiles (feature_key, profile_key, profile_name, file_path, sort_order) VALUES
('ram-optimization', '2gb', '2GB RAM', 'Optimizer/Ram Optimization/2GB RAM.reg', 1),
('ram-optimization', '3gb', '3GB RAM', 'Optimizer/Ram Optimization/3GB RAM.reg', 2),
('ram-optimization', '4gb', '4GB RAM', 'Optimizer/Ram Optimization/4GB Ram.reg', 3),
('ram-optimization', '6gb', '6GB RAM', 'Optimizer/Ram Optimization/6GB Ram.reg', 4),
('ram-optimization', '8gb', '8GB RAM', 'Optimizer/Ram Optimization/8GB Ram.reg', 5),
('ram-optimization', '10gb', '10GB RAM', 'Optimizer/Ram Optimization/10GB RAM.reg', 6),
('ram-optimization', '12gb', '12GB RAM', 'Optimizer/Ram Optimization/12GB Ram.reg', 7),
('ram-optimization', '16gb', '16GB RAM', 'Optimizer/Ram Optimization/16GB Ram.reg', 8),
('ram-optimization', '20gb', '20GB RAM', 'Optimizer/Ram Optimization/20GB Ram.reg', 9),
('ram-optimization', '24gb', '24GB RAM', 'Optimizer/Ram Optimization/24GB Ram.reg', 10),
('ram-optimization', '32gb', '32GB RAM', 'Optimizer/Ram Optimization/32GB Ram.reg', 11),
('ram-optimization', '48gb', '48GB RAM', 'Optimizer/Ram Optimization/48GB Ram.reg', 12),
('ram-optimization', '64gb', '64GB RAM', 'Optimizer/Ram Optimization/64GB Ram.reg', 13),
('ram-optimization', 'default', 'Reset to Default', 'Optimizer/Ram Optimization/Reset to Default.reg', 14)
ON DUPLICATE KEY UPDATE profile_name = VALUES(profile_name), file_path = VALUES(file_path), sort_order = VALUES(sort_order);

-- Power Plan Feature
INSERT INTO features (feature_key, feature_name, section, description) 
VALUES ('power-plan', 'Power Plan Selection', 'Optimize', 'Chọn Power Plan hiệu năng cao nhất')
ON DUPLICATE KEY UPDATE feature_name = VALUES(feature_name), section = VALUES(section), description = VALUES(description);

-- Power Plan Profiles
INSERT INTO feature_profiles (feature_key, profile_key, profile_name, file_path, sort_order) VALUES
('power-plan', 'dawa-ultimate', 'DAWA Ultimate Performance', 'Optimizer/4. PowerPlan/Dawa_Utilmate.pow', 1),
('power-plan', 'atlas', 'Atlas Power Plan', 'Optimizer/4. PowerPlan/Atlas.pow', 2),
('power-plan', 'bitsum-highest', 'Bitsum Highest Performance', 'Optimizer/4. PowerPlan/Bitsum-Highest-Performance.pow', 3),
('power-plan', 'amitv3-idle', 'Amitv3 Idle Enabled', 'Optimizer/4. PowerPlan/Amitv3IdleEnabled.pow', 4),
('power-plan', 'framesync-boost', 'FrameSync Boost', 'Optimizer/4. PowerPlan/FrameSyncBoost.pow', 5)
ON DUPLICATE KEY UPDATE profile_name = VALUES(profile_name), file_path = VALUES(file_path), sort_order = VALUES(sort_order);

-- Mouse Data Queue Feature
INSERT INTO features (feature_key, feature_name, section, description) 
VALUES ('mouse-queue', 'Mouse Data Queue Size', 'Input Lag', 'Chọn Data Queue Size cho chuột')
ON DUPLICATE KEY UPDATE feature_name = VALUES(feature_name), section = VALUES(section), description = VALUES(description);

-- Mouse Queue Profiles
INSERT INTO feature_profiles (feature_key, profile_key, profile_name, file_path, sort_order) VALUES
('mouse-queue', '10', '10 Decimal', 'Input Lag/Mouse/DataQueueSize/10 Decimal.reg', 1),
('mouse-queue', '20', '20 Decimal', 'Input Lag/Mouse/DataQueueSize/20 Decimal.reg', 2),
('mouse-queue', '22', '22 Decimal', 'Input Lag/Mouse/DataQueueSize/22 Decimal.reg', 3),
('mouse-queue', '25', '25 Decimal', 'Input Lag/Mouse/DataQueueSize/25 Decimal.reg', 4),
('mouse-queue', 'default', 'Default Windows', 'Input Lag/Mouse/DataQueueSize/Default Windows.reg', 5)
ON DUPLICATE KEY UPDATE profile_name = VALUES(profile_name), file_path = VALUES(file_path), sort_order = VALUES(sort_order);

-- Keyboard Data Queue Feature
INSERT INTO features (feature_key, feature_name, section, description) 
VALUES ('keyboard-queue', 'Keyboard Data Queue Size', 'Input Lag', 'Chọn Data Queue Size cho bàn phím')
ON DUPLICATE KEY UPDATE feature_name = VALUES(feature_name), section = VALUES(section), description = VALUES(description);

-- Keyboard Queue Profiles
INSERT INTO feature_profiles (feature_key, profile_key, profile_name, file_path, sort_order) VALUES
('keyboard-queue', '10', '10 Decimal', 'Input Lag/Keyboard/DataQueueSize/10 Decimal.reg', 1),
('keyboard-queue', '15', '15 Decimal', 'Input Lag/Keyboard/DataQueueSize/15 Decimal.reg', 2),
('keyboard-queue', '20', '20 Decimal', 'Input Lag/Keyboard/DataQueueSize/20 Decimal.reg', 3),
('keyboard-queue', '22', '22 Decimal', 'Input Lag/Keyboard/DataQueueSize/22 Decimal.reg', 4),
('keyboard-queue', '25', '25 Decimal', 'Input Lag/Keyboard/DataQueueSize/25 Decimal.reg', 5),
('keyboard-queue', 'default', 'Default Windows', 'Input Lag/Keyboard/DataQueueSize/Default Windows.reg', 6)
ON DUPLICATE KEY UPDATE profile_name = VALUES(profile_name), file_path = VALUES(file_path), sort_order = VALUES(sort_order);

-- Network Tweaks Feature
INSERT INTO features (feature_key, feature_name, section, description) 
VALUES ('network-tweaks', 'Network Registry Tweaks', 'Network', 'Chọn file .reg tinh chỉnh TCP/IP')
ON DUPLICATE KEY UPDATE feature_name = VALUES(feature_name), section = VALUES(section), description = VALUES(description);

-- Network Profiles
INSERT INTO feature_profiles (feature_key, profile_key, profile_name, file_path, sort_order) VALUES
('network-tweaks', 'full-tweaks', 'Network Tweaks (Full TCP/IP)', 'Network/Network Tweaks.reg', 1),
('network-tweaks', 'fast-send', 'Fast Send Datagram Threshold', 'Network/FastSendDatagramThreshold.reg', 2)
ON DUPLICATE KEY UPDATE profile_name = VALUES(profile_name), file_path = VALUES(file_path), sort_order = VALUES(sort_order);

-- Restore Feature
INSERT INTO features (feature_key, feature_name, section, description) 
VALUES ('restore', 'Restore Services', 'Restore', 'Khôi phục các dịch vụ Windows về mặc định')
ON DUPLICATE KEY UPDATE feature_name = VALUES(feature_name), section = VALUES(section), description = VALUES(description);

-- Restore Profiles
INSERT INTO feature_profiles (feature_key, profile_key, profile_name, file_path, sort_order) VALUES
('restore', 'gamer', 'Gamer Services Restore', 'Restore/Disable Services For Gamers Restore.reg', 1),
('restore', 'professional', 'Professional Services Restore', 'Restore/Disable Services For Professionals Restore.reg', 2)
ON DUPLICATE KEY UPDATE profile_name = VALUES(profile_name), file_path = VALUES(file_path), sort_order = VALUES(sort_order);

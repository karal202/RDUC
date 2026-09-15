-- =====================================================
-- DATABASE SCHEMA: HỆ THỐNG QUẢN LÝ LICENSE KEY
-- Áp dụng cho: web tải app .exe + nhập key kích hoạt
-- Tương thích: MySQL 8+
-- Bản CLEAN: gộp toàn bộ các bản vá (ALTER TABLE...) trực
-- tiếp vào CREATE TABLE gốc. Chỉ cần chạy file này 1 lần
-- trên database rỗng là xong, không cần chạy file cũ nữa.
-- =====================================================

CREATE DATABASE IF NOT EXISTS defaultdb;
USE defaultdb;

-- ---------------------------------------------------
-- 1. ADMIN (người quản trị hệ thống, tạo/quản lý key)
-- ---------------------------------------------------
CREATE TABLE admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,   -- bcrypt/argon2, KHÔNG lưu plaintext
    role ENUM('super_admin','admin') DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    active_session_id VARCHAR(64) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 2. LICENSE KEY
-- ---------------------------------------------------
CREATE TABLE license_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key_code VARCHAR(255) UNIQUE NOT NULL,      -- ví dụ: XXXX-XXXX-XXXX-XXXX
    customer_name VARCHAR(255),                 -- tên khách hàng mua key
    customer_contact VARCHAR(255),               -- SĐT / email / Zalo / Facebook...
    max_devices INT DEFAULT 1,                  -- số thiết bị tối đa được phép dùng chung key
    status ENUM('active','disabled','expired','revoked') DEFAULT 'active',
    expires_at DATETIME NULL,                   -- NULL = vĩnh viễn
    note VARCHAR(255),                          -- ghi chú thêm của admin
    bound_ip_address VARCHAR(255) NULL,          -- IP công khai duy nhất được phép dùng key này
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admins(id),
    INDEX idx_license_keys_status (status),
    INDEX idx_license_keys_expires_at (expires_at),
    INDEX idx_customer_name (customer_name),
    INDEX idx_customer_contact (customer_contact)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 3. THIẾT BỊ
-- ---------------------------------------------------
CREATE TABLE devices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    device_hash VARCHAR(255) UNIQUE NOT NULL,   -- hash từ HWID (CPU ID, disk serial, MAC...)
    device_name VARCHAR(255),
    os_info VARCHAR(255),
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_devices_hash (device_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 4. RÀNG BUỘC KEY <-> THIẾT BỊ
-- ---------------------------------------------------
CREATE TABLE key_device_map (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key_id INT NOT NULL,
    device_id INT NOT NULL,
    activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (key_id) REFERENCES license_keys(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    UNIQUE (key_id, device_id),
    INDEX idx_key_device_map_key_id (key_id),
    INDEX idx_key_device_map_device_id (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 5. LOG LỊCH SỬ CHECK/ACTIVATE (audit + chống brute-force)
-- ---------------------------------------------------
CREATE TABLE activation_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    key_code VARCHAR(255),
    device_hash VARCHAR(255),
    ip_address VARCHAR(255),
    result ENUM('success','invalid_key','expired','device_limit','disabled','revoked','ip_mismatch') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_logs_key_code (key_code),
    INDEX idx_logs_device_hash (device_hash),
    INDEX idx_logs_ip_address (ip_address),
    INDEX idx_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 6. FEATURES (nhóm tính năng chính)
-- ---------------------------------------------------
CREATE TABLE features (
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

-- ---------------------------------------------------
-- 7. FEATURE PROFILES (các lựa chọn cho mỗi feature)
-- ---------------------------------------------------
CREATE TABLE feature_profiles (
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

-- ---------------------------------------------------
-- 8. AUDIT LOG cho features/profiles
-- ---------------------------------------------------
CREATE TABLE feature_audit_log (
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

-- ---------------------------------------------------
-- 9. FEATURE FILE POLICIES (gộp toàn bộ cột từ các bản
--    ALTER TABLE cũ: section, file_path, created_by,
--    created_at, deleted_at) — không cần migrate nữa
-- ---------------------------------------------------
CREATE TABLE feature_file_policies (
    feature_key VARCHAR(100) PRIMARY KEY,
    section VARCHAR(100) NOT NULL DEFAULT 'General',
    file_path VARCHAR(500) NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by INT NULL,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL DEFAULT NULL,
    CONSTRAINT fk_feature_policy_admin FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_section (section),
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- DỮ LIỆU MẶC ĐỊNH: FEATURES + PROFILES
-- (dựa theo chức năng có sẵn của app Electron)
-- =====================================================

-- RAM Optimization
INSERT INTO features (feature_key, feature_name, section, description) VALUES
('ram-optimization', 'RAM Profile Optimization', 'Optimize', 'Chọn profile RAM tương ứng với dung lượng RAM của bạn');

INSERT INTO feature_profiles (feature_key, profile_key, profile_name, file_path, sort_order) VALUES
('ram-optimization', '2gb',    '2GB RAM',           'Optimizer/Ram Optimization/2GB RAM.reg', 1),
('ram-optimization', '3gb',    '3GB RAM',           'Optimizer/Ram Optimization/3GB RAM.reg', 2),
('ram-optimization', '4gb',    '4GB RAM',           'Optimizer/Ram Optimization/4GB Ram.reg', 3),
('ram-optimization', '6gb',    '6GB RAM',           'Optimizer/Ram Optimization/6GB Ram.reg', 4),
('ram-optimization', '8gb',    '8GB RAM',           'Optimizer/Ram Optimization/8GB Ram.reg', 5),
('ram-optimization', '10gb',   '10GB RAM',          'Optimizer/Ram Optimization/10GB RAM.reg', 6),
('ram-optimization', '12gb',   '12GB RAM',          'Optimizer/Ram Optimization/12GB Ram.reg', 7),
('ram-optimization', '16gb',   '16GB RAM',          'Optimizer/Ram Optimization/16GB Ram.reg', 8),
('ram-optimization', '20gb',   '20GB RAM',          'Optimizer/Ram Optimization/20GB Ram.reg', 9),
('ram-optimization', '24gb',   '24GB RAM',          'Optimizer/Ram Optimization/24GB Ram.reg', 10),
('ram-optimization', '32gb',   '32GB RAM',          'Optimizer/Ram Optimization/32GB Ram.reg', 11),
('ram-optimization', '48gb',   '48GB RAM',          'Optimizer/Ram Optimization/48GB Ram.reg', 12),
('ram-optimization', '64gb',   '64GB RAM',          'Optimizer/Ram Optimization/64GB Ram.reg', 13),
('ram-optimization', 'default','Reset to Default',  'Optimizer/Ram Optimization/Reset to Default.reg', 14);

-- Power Plan
INSERT INTO features (feature_key, feature_name, section, description) VALUES
('power-plan', 'Power Plan Selection', 'Optimize', 'Chọn Power Plan hiệu năng cao nhất');

INSERT INTO feature_profiles (feature_key, profile_key, profile_name, file_path, sort_order) VALUES
('power-plan', 'dawa-ultimate',   'DAWA Ultimate Performance',  'Optimizer/4. PowerPlan/Dawa_Utilmate.pow', 1),
('power-plan', 'atlas',           'Atlas Power Plan',           'Optimizer/4. PowerPlan/Atlas.pow', 2),
('power-plan', 'bitsum-highest',  'Bitsum Highest Performance', 'Optimizer/4. PowerPlan/Bitsum-Highest-Performance.pow', 3),
('power-plan', 'amitv3-idle',     'Amitv3 Idle Enabled',        'Optimizer/4. PowerPlan/Amitv3IdleEnabled.pow', 4),
('power-plan', 'framesync-boost', 'FrameSync Boost',            'Optimizer/4. PowerPlan/FrameSyncBoost.pow', 5);

-- Mouse Data Queue
INSERT INTO features (feature_key, feature_name, section, description) VALUES
('mouse-queue', 'Mouse Data Queue Size', 'Input Lag', 'Chọn Data Queue Size cho chuột');

INSERT INTO feature_profiles (feature_key, profile_key, profile_name, file_path, sort_order) VALUES
('mouse-queue', '10',      '10 Decimal',      'Input Lag/Mouse/DataQueueSize/10 Decimal.reg', 1),
('mouse-queue', '20',      '20 Decimal',      'Input Lag/Mouse/DataQueueSize/20 Decimal.reg', 2),
('mouse-queue', '22',      '22 Decimal',      'Input Lag/Mouse/DataQueueSize/22 Decimal.reg', 3),
('mouse-queue', '25',      '25 Decimal',      'Input Lag/Mouse/DataQueueSize/25 Decimal.reg', 4),
('mouse-queue', 'default', 'Default Windows', 'Input Lag/Mouse/DataQueueSize/Default Windows.reg', 5);

-- Keyboard Data Queue
INSERT INTO features (feature_key, feature_name, section, description) VALUES
('keyboard-queue', 'Keyboard Data Queue Size', 'Input Lag', 'Chọn Data Queue Size cho bàn phím');

INSERT INTO feature_profiles (feature_key, profile_key, profile_name, file_path, sort_order) VALUES
('keyboard-queue', '10',      '10 Decimal',      'Input Lag/Keyboard/DataQueueSize/10 Decimal.reg', 1),
('keyboard-queue', '15',      '15 Decimal',      'Input Lag/Keyboard/DataQueueSize/15 Decimal.reg', 2),
('keyboard-queue', '20',      '20 Decimal',      'Input Lag/Keyboard/DataQueueSize/20 Decimal.reg', 3),
('keyboard-queue', '22',      '22 Decimal',      'Input Lag/Keyboard/DataQueueSize/22 Decimal.reg', 4),
('keyboard-queue', '25',      '25 Decimal',      'Input Lag/Keyboard/DataQueueSize/25 Decimal.reg', 5),
('keyboard-queue', 'default', 'Default Windows', 'Input Lag/Keyboard/DataQueueSize/Default Windows.reg', 6);

-- Network Tweaks
INSERT INTO features (feature_key, feature_name, section, description) VALUES
('network-tweaks', 'Network Registry Tweaks', 'Network', 'Chọn file .reg tinh chỉnh TCP/IP');

INSERT INTO feature_profiles (feature_key, profile_key, profile_name, file_path, sort_order) VALUES
('network-tweaks', 'full-tweaks', 'Network Tweaks (Full TCP/IP)',   'Network/Network Tweaks.reg', 1),
('network-tweaks', 'fast-send',   'Fast Send Datagram Threshold',   'Network/FastSendDatagramThreshold.reg', 2);

-- Restore
INSERT INTO features (feature_key, feature_name, section, description) VALUES
('restore', 'Restore Services', 'Restore', 'Khôi phục các dịch vụ Windows về mặc định');

INSERT INTO feature_profiles (feature_key, profile_key, profile_name, file_path, sort_order) VALUES
('restore', 'gamer',        'Gamer Services Restore',        'Restore/Disable Services For Gamers Restore.reg', 1),
('restore', 'professional', 'Professional Services Restore', 'Restore/Disable Services For Professionals Restore.reg', 2);

-- =====================================================
-- DỮ LIỆU MẶC ĐỊNH: FEATURE FILE POLICIES
-- =====================================================
INSERT INTO feature_file_policies (feature_key, section, file_path, enabled, created_at, updated_at) VALUES
('bios-bat',                     'BIOS',           'BIOS/bios.bat', true, NOW(), NOW()),
('ntfs-bat',                     'BIOS / NTFS',    'BIOS/NTFS.bat', true, NOW(), NOW()),
('network-full-tweaks',          'Network',        'Network/Network Tweaks.reg', true, NOW(), NOW()),
('network-fast-send',            'Network',        'Network/FastSendDatagramThreshold.reg', true, NOW(), NOW()),
('mouse-queue-10',                'Input Lag',      'Input Lag/Mouse/DataQueueSize/10 Decimal.reg', true, NOW(), NOW()),
('mouse-queue-20',                'Input Lag',      'Input Lag/Mouse/DataQueueSize/20 Decimal.reg', true, NOW(), NOW()),
('mouse-queue-22',                'Input Lag',      'Input Lag/Mouse/DataQueueSize/22 Decimal.reg', true, NOW(), NOW()),
('mouse-queue-25',                'Input Lag',      'Input Lag/Mouse/DataQueueSize/25 Decimal.reg', true, NOW(), NOW()),
('mouse-queue-default',           'Input Lag',      'Input Lag/Mouse/DataQueueSize/Default Windows.reg', true, NOW(), NOW()),
('keyboard-queue-10',             'Input Lag',      'Input Lag/Keyboard/DataQueueSize/10 Decimal.reg', true, NOW(), NOW()),
('keyboard-queue-15',             'Input Lag',      'Input Lag/Keyboard/DataQueueSize/15 Decimal.reg', true, NOW(), NOW()),
('keyboard-queue-20',             'Input Lag',      'Input Lag/Keyboard/DataQueueSize/20 Decimal.reg', true, NOW(), NOW()),
('keyboard-queue-22',             'Input Lag',      'Input Lag/Keyboard/DataQueueSize/22 Decimal.reg', true, NOW(), NOW()),
('keyboard-queue-25',             'Input Lag',      'Input Lag/Keyboard/DataQueueSize/25 Decimal.reg', true, NOW(), NOW()),
('keyboard-queue-default',        'Input Lag',      'Input Lag/Keyboard/DataQueueSize/Default Windows.reg', true, NOW(), NOW()),
('msi-utility',                   'Tools & Cache',  'Tool&cache/MSI Utility/MSI Utility V3.exe', true, NOW(), NOW()),
('windows-settings-tweaks',       'Tools & Cache',  'Tool&cache/Classic Right Click Menu/Windows 11.reg', true, NOW(), NOW()),
('dawa-cleaner',                  'Tools & Cache',  'Tool&cache/Clean/Clear.bat', true, NOW(), NOW()),
('ram-optimization',              'Optimize',       'Optimizer/Ram Optimization/Reset to Default.reg', true, NOW(), NOW()),
('dawa-power-plan',               'Optimize',       'Optimizer/4. PowerPlan/Dawa_Utilmate.pow', true, NOW(), NOW()),
('win32-priority',                'Optimize',       'Optimizer/8. Win32Priority/26 hex.reg', true, NOW(), NOW()),
('restore-gamer-services',        'Restore',        'Restore/Disable Services For Gamers Restore.reg', true, NOW(), NOW()),
('restore-professional-services', 'Restore',        'Restore/Disable Services For Professionals Restore.reg', true, NOW(), NOW()),
('dawa-gaming-boost',             'Optimize',       '(internal)', true, NOW(), NOW()),
('win-disable-hibernate',         'Windows Tweaks', '(internal)', true, NOW(), NOW()),
('win-enable-hibernate',          'Windows Tweaks', '(internal)', true, NOW(), NOW()),
('win-disable-fso-gamebar',       'Windows Tweaks', '(internal)', true, NOW(), NOW()),
('win-enable-fso-gamebar',        'Windows Tweaks', '(internal)', true, NOW(), NOW()),
('win-disable-telemetry',         'Windows Tweaks', '(internal)', true, NOW(), NOW()),
('win-enable-telemetry',          'Windows Tweaks', '(internal)', true, NOW(), NOW()),
('win-disable-superfetch',        'Windows Tweaks', '(internal)', true, NOW(), NOW()),
('win-enable-superfetch',         'Windows Tweaks', '(internal)', true, NOW(), NOW()),
('win-disable-transparency',      'Windows Tweaks', 'Optimizer/3. Windows Settings/Disable Transparency.reg', true, NOW(), NOW()),
('win-enable-transparency',       'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable Transparency.reg', true, NOW(), NOW()),
('win-enable-maintenance',       'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable Automatic Maintenance.reg', true, NOW(), NOW()),
('win-enable-timer-coalescing',  'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable CoalescingTimerInterval.reg', true, NOW(), NOW()),
('win-enable-hibernation',       'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable Hibernation.reg', true, NOW(), NOW()),
('win-enable-memory-mirroring',  'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable MemoryMirroring.reg', true, NOW(), NOW()),
('win-enable-network-throttling','Windows Tweaks', 'Optimizer/3. Windows Settings/Enable NetworkThrottling.reg', true, NOW(), NOW()),
('win-enable-runtime-broker',    'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable Runtime Broker.reg', true, NOW(), NOW()),
('win-enable-spectre-meltdown',  'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable Spectre and Meltdown.reg', true, NOW(), NOW()),
('win-enable-sync',              'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable Sync.reg', true, NOW(), NOW()),
('win-enable-windows-apps',      'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable Windows Apps.reg', true, NOW(), NOW()),
('mouse-disable-acceleration',    'Input Lag',      'Input Lag/Reduce Input Lag/System.reg', true, NOW(), NOW()),
('mouse-queue-15',               'Input Lag',      'Input Lag/Mouse/DataQueueSize/15 Decimal.reg', true, NOW(), NOW()),
('input-avx',                     'Input Lag',      'Input Lag/Reduce Input Lag/AVX.reg', true, NOW(), NOW()),
('input-cache',                   'Input Lag',      'Input Lag/Reduce Input Lag/Cache.reg', true, NOW(), NOW()),
('input-desktop',                 'Input Lag',      'Input Lag/Reduce Input Lag/Desktop.reg', true, NOW(), NOW()),
('input-low-latency',             'Input Lag',      'Input Lag/Reduce Input Lag/LowLatency.reg', true, NOW(), NOW()),
('input-misc',                    'Input Lag',      'Input Lag/Reduce Input Lag/Misc.reg', true, NOW(), NOW()),
('input-scripts',                 'Input Lag',      'Input Lag/Reduce Input Lag/Scripts.reg', true, NOW(), NOW()),
('input-system',                  'Input Lag',      'Input Lag/Reduce Input Lag/System.reg', true, NOW(), NOW()),
('win-desktop-settings',          'Windows Tweaks', 'Optimizer/3. Windows Settings/Desktop Settings.reg', true, NOW(), NOW()),
('win-disable-maintenance',       'Windows Tweaks', 'Optimizer/3. Windows Settings/Disable Automatic Maintenance.reg', true, NOW(), NOW()),
('win-disable-background-apps',   'Windows Tweaks', 'Optimizer/3. Windows Settings/Disable Background Apps.reg', true, NOW(), NOW()),
('win-enable-background-apps',    'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable Background Apps.reg', true, NOW(), NOW()),
('win-disable-timer-coalescing',  'Windows Tweaks', 'Optimizer/3. Windows Settings/Disable CoalescingTimerInterval.reg', true, NOW(), NOW()),
('win-disable-cpu-throttling',    'Windows Tweaks', 'Optimizer/3. Windows Settings/Disable CpuPwrThrottling.reg', true, NOW(), NOW()),
('win-enable-cpu-throttling',     'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable CpuPwrThrottling.reg', true, NOW(), NOW()),
('win-disable-driver-updates',    'Windows Tweaks', 'Optimizer/3. Windows Settings/Disable Drivers Updates.reg', true, NOW(), NOW()),
('win-enable-driver-updates',     'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable Drivers Updates.reg', true, NOW(), NOW()),
('win-disable-extra-services',    'Windows Tweaks', 'Optimizer/3. Windows Settings/Disable Extra Unnecessary Services.reg', true, NOW(), NOW()),
('win-enable-extra-services',     'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable Extra Unnecessary Services.reg', true, NOW(), NOW()),
('win-disable-memory-mirroring',  'Windows Tweaks', 'Optimizer/3. Windows Settings/Disable MemoryMirroring.reg', true, NOW(), NOW()),
('win-disable-network-throttling','Windows Tweaks', 'Optimizer/3. Windows Settings/Disable NetworkThrottling.reg', true, NOW(), NOW()),
('win-disable-notifications',     'Windows Tweaks', 'Optimizer/3. Windows Settings/Disable NotificationCenter.reg', true, NOW(), NOW()),
('win-enable-notifications',      'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable NotificationCenter.reg', true, NOW(), NOW()),
('win-disable-runtime-broker',    'Windows Tweaks', 'Optimizer/3. Windows Settings/Disable Runtime Broker.reg', true, NOW(), NOW()),
('win-disable-spectre-meltdown',  'Windows Tweaks', 'Optimizer/3. Windows Settings/Disable Spectre and Meltdown.reg', true, NOW(), NOW()),
('win-disable-sync',              'Windows Tweaks', 'Optimizer/3. Windows Settings/Disable Sync.reg', true, NOW(), NOW()),
('win-disable-windows-apps',      'Windows Tweaks', 'Optimizer/3. Windows Settings/Disable Windows Apps.reg', true, NOW(), NOW()),
('win-fine-memory-quota',         'Windows Tweaks', 'Optimizer/3. Windows Settings/FineGrainedMemoryQuota.reg', true, NOW(), NOW()),
('win-large-page',                'Windows Tweaks', 'Optimizer/3. Windows Settings/LargePage.reg', true, NOW(), NOW()),
('win-low-latency',              'Windows Tweaks', 'Optimizer/3. Windows Settings/Low Latency.reg', true, NOW(), NOW()),
('win-memory-management',        'Windows Tweaks', 'Optimizer/3. Windows Settings/Memory Management.reg', true, NOW(), NOW()),
('win-perf-boost-mode',          'Windows Tweaks', 'Optimizer/3. Windows Settings/PerfBoostMode.reg', true, NOW(), NOW()),
('win-power-settings',           'Windows Tweaks', 'Optimizer/3. Windows Settings/Power Settings.reg', true, NOW(), NOW()),
('win-prioritize-gpu',            'Windows Tweaks', 'Optimizer/3. Windows Settings/Prioritize GPU.reg', true, NOW(), NOW()),
('network-tcp-ping',              'Network',        'Network/TCP Ping.reg', true, NOW(), NOW()),
('network-flush-dns',             'Network',        'Network/DNS.cmd', true, NOW(), NOW()),
('network-dns-gaming',            'Network',        'Network/DNS.cmd', true, NOW(), NOW()),
('keyboard-zero-delay',           'Input Lag',      'Input Lag/Reduce Input Lag/Graphics.reg', true, NOW(), NOW()),
('amd-radeonmod',                 'Tools & Cache',  'Tool&cache/For Amd/RadeonMod/RadeonMod.exe', true, NOW(), NOW()),
('amd-morepowertool',             'Tools & Cache',  'Tool&cache/For Amd/MorePowerTool/MorePowerTool.exe', true, NOW(), NOW()),
('amd-radeonsoftwarelimmer',      'Tools & Cache',  'Tool&cache/For Amd/RadeonSoftwareSlimmer/RadeonSoftwareSlimmer.exe', true, NOW(), NOW()),
('amd-moreclocktool',             'Tools & Cache',  'Tool&cache/For Amd/MoreClockTool/MoreClockTool.exe', true, NOW(), NOW()),
('amd-3d-settings',               'Tools & Cache',  'Tool&cache/For Amd/3D Settings.reg', true, NOW(), NOW()),
('amd-driver-tweaks',             'Tools & Cache',  'Tool&cache/For Amd/Driver Tweaks.reg', true, NOW(), NOW()),
('nvidia-nvcleanstall',           'Tools & Cache',  'Tool&cache/For Nvidia/NvCleanstall/NVCleanstall_1.19.0.exe', true, NOW(), NOW()),
('nvidia-profile-inspector',      'Tools & Cache',  'Tool&cache/For Nvidia/Nvidia Profile Inspector/nvidiaProfileInspector/nvidiaProfileInspector.exe', true, NOW(), NOW()),
('nvidia-inspector',              'Tools & Cache',  'Tool&cache/For Nvidia/nvidiaInspector/nvidiaInspector.exe', true, NOW(), NOW()),
('nvidia-powermizer',             'Tools & Cache',  'Tool&cache/For Nvidia/Nvidia PowerMizer/Nvidia PowerMizer.exe', true, NOW(), NOW()),
('nvidia-desktop-composition',    'Tools & Cache',  'Tool&cache/For Nvidia/Desktop Composition.reg', true, NOW(), NOW()),
('nvidia-gamedvr-gamemode',       'Tools & Cache',  'Tool&cache/For Nvidia/GameDVR And Game Mode.reg', true, NOW(), NOW()),
('nvidia-graphics-tweaks',       'Tools & Cache',  'Tool&cache/For Nvidia/GraphicsDrivers Tweaks.reg', true, NOW(), NOW()),
('nvidia-nvidia-tweaks',          'Tools & Cache',  'Tool&cache/For Nvidia/NVIDIA Driver Tweaks.reg', true, NOW(), NOW()),
('nvidia-power-latency',         'Tools & Cache',  'Tool&cache/For Nvidia/Power And Latency Tweaks.reg', true, NOW(), NOW()),
('nvidia-task-priority',          'Tools & Cache',  'Tool&cache/For Nvidia/Task Priority Tweaks.reg', true, NOW(), NOW()),
('disable-extreme-drivers',       'Tools & Cache',  'Tool&cache/Extreme Reg/Disable Drivers.reg', true, NOW(), NOW()),
('disable-extreme-gamer-services','Tools & Cache',  'Tool&cache/Extreme Reg/Disable Services For Gamers.reg', true, NOW(), NOW()),
('disable-extreme-professional-services', 'Tools & Cache',  'Tool&cache/Extreme Reg/Disable Services For Professionals.reg', true, NOW(), NOW()),
('enable-extreme-drivers',        'Tools & Cache',  'Tool&cache/Extreme Reg/Enable Drivers.reg', true, NOW(), NOW()),
('enable-extreme-gamer-services', 'Tools & Cache',  'Tool&cache/Extreme Reg/Enable Services For Gamers.reg', true, NOW(), NOW()),
('restore-extreme-gamer-services','Tools & Cache',  'Tool&cache/Extreme Reg/Restore/Disable Services For Gamers Restore.reg', true, NOW(), NOW()),
('restore-extreme-professional-services', 'Tools & Cache',  'Tool&cache/Extreme Reg/Restore/Disable Services For Professionals Restore.reg', true, NOW(), NOW()),
('ame-beta',                     'Tools & Cache',  'Tool&cache/AME Beta.exe', true, NOW(), NOW()),
('throttlestop',                 'Tools & Cache',  'Tool&cache/ThrottleStop.exe', true, NOW(), NOW()),
('parkcontrol',                  'Tools & Cache',  'Tool&cache/parkcontrolsetup64.exe', true, NOW(), NOW()),
('processlasso',                 'Tools & Cache',  'Tool&cache/processlassosetup64.exe', true, NOW(), NOW()),
('quickcpu',                     'Tools & Cache',  'Tool&cache/QuickCpuSetup.msi', true, NOW(), NOW()),
('win-disable-fso-gamebar',      'Windows Tweaks', 'Optimizer/3. Windows Settings/Disable FSO Game Bar.reg', true, NOW(), NOW()),
('win-enable-fso-gamebar',       'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable FSO Game Bar.reg', true, NOW(), NOW()),
('win-disable-telemetry',        'Windows Tweaks', 'Optimizer/3. Windows Settings/Disable Telemetry.reg', true, NOW(), NOW()),
('win-enable-telemetry',         'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable Telemetry.reg', true, NOW(), NOW()),
('win-disable-superfetch',       'Windows Tweaks', 'Optimizer/3. Windows Settings/Disable Superfetch.reg', true, NOW(), NOW()),
('win-enable-superfetch',        'Windows Tweaks', 'Optimizer/3. Windows Settings/Enable Superfetch.reg', true, NOW(), NOW());
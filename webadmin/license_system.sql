-- =====================================================
-- DATABASE SCHEMA: HỆ THỐNG QUẢN LÝ LICENSE KEY
-- Áp dụng cho: web tải app .exe + nhập key kích hoạt
-- Tương thích: MySQL 8+ / PostgreSQL 13+ (một vài kiểu dữ liệu cần đổi nhẹ)
-- =====================================================

CREATE DATABASE IF NOT EXISTS license_system;
USE license_system;

-- ---------------------------------------------------
-- 1. BẢNG ADMIN (người quản trị hệ thống, tạo/quản lý key)
-- ---------------------------------------------------
-- 1. Bảng admin quản trị
CREATE TABLE admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,   -- bcrypt/argon2, KHÔNG lưu plaintext
    role ENUM('super_admin','admin') DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- 2. Bảng license key (đã bỏ product_id, thêm thông tin khách hàng + IP binding)
CREATE TABLE license_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key_code VARCHAR(64) UNIQUE NOT NULL,      -- ví dụ: XXXX-XXXX-XXXX-XXXX
    customer_name VARCHAR(100),                -- tên khách hàng mua key
    customer_contact VARCHAR(150),             -- SĐT / email / Zalo / Facebook...
    max_devices INT DEFAULT 1,                 -- số thiết bị tối đa được phép dùng chung key
    status ENUM('active','disabled','expired','revoked') DEFAULT 'active',
    expires_at DATETIME NULL,                  -- NULL = vĩnh viễn
    note VARCHAR(255),                         -- ghi chú thêm của admin
    bound_ip_address VARCHAR(45) NULL,         -- IP công khai duy nhất được phép dùng key này (NULL = chưa kích hoạt lần nào)
    created_by INT NOT NULL,                   -- admin nào tạo key
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admins(id)
);

-- 3. Bảng thiết bị
CREATE TABLE devices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    device_hash VARCHAR(128) UNIQUE NOT NULL,  -- hash từ HWID (CPU ID, disk serial, MAC...)
    device_name VARCHAR(100),                  -- tên máy (optional)
    os_info VARCHAR(100),
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng ràng buộc key <-> thiết bị
CREATE TABLE key_device_map (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key_id INT NOT NULL,
    device_id INT NOT NULL,
    activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,            -- admin có thể gỡ 1 device khỏi key
    FOREIGN KEY (key_id) REFERENCES license_keys(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    UNIQUE (key_id, device_id)
);

-- 5. Log lịch sử check/activate (audit + chống brute-force)
CREATE TABLE activation_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    key_code VARCHAR(64),
    device_hash VARCHAR(128),
    ip_address VARCHAR(45),
    result ENUM('success','invalid_key','expired','device_limit','disabled','revoked','ip_mismatch') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEX GỢI Ý ĐỂ TĂNG TỐC ĐỘ TRUY VẤN
-- =====================================================
CREATE INDEX idx_license_keys_status ON license_keys(status);
CREATE INDEX idx_activations_hardware ON activations(hardware_id);
CREATE INDEX idx_logs_created_at ON activation_logs(created_at);
CREATE INDEX idx_blocked_ips_ip ON blocked_ips(ip_address);
CREATE INDEX idx_blocked_hardware_id ON blocked_hardware(hardware_id);
CREATE INDEX idx_customer_name ON license_keys(customer_name);
CREATE INDEX idx_customer_contact ON license_keys(customer_contact);
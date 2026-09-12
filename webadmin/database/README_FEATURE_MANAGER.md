# Feature Manager - Hướng dẫn cài đặt và sử dụng

## 📋 Tổng quan

Feature Manager là hệ thống CRUD cho phép admin quản lý tính năng và các file kích hoạt tương ứng từ web admin. App Electron sẽ nhận cấu hình mới từ backend khi admin thay đổi.

## 🔒 Bảo mật

Hệ thống có các lớp bảo vệ:

1. **Path Validation**: Chỉ cho phép file paths trong `resources/scripts/`
2. **Key Format Validation**: Key phải follow pattern kebab-case (lowercase, numbers, hyphens only)
3. **File Existence Check**: Backend verify file thực sự tồn tại trước khi accept
4. **Admin Authentication**: Chỉ admin đã login mới có thể CRUD
5. **Audit Logs**: Log tất cả thay đổi với user ID, timestamp, IP address
6. **Rate Limiting**: Giới hạn 120 requests/15 phút
7. **CORS Protection**: Chỉ cho phép origins đã whitelist

## 📦 Cài đặt

### 1. Chạy SQL migration

```bash
# Kết nối vào MySQL/MariaDB database
mysql -u username -p database_name

# Chạy các file SQL theo thứ tự:
source D:\RDUC\webadmin\database\20260912_feature_profiles.sql
source D:\RDUC\webadmin\database\20260912_populate_features.sql
```

### 2. Restart backend

```bash
cd D:\RDUC\webadmin\backend
npm start
```

### 3. Frontend sẽ tự reload

Vite dev server sẽ tự reload với các thay đổi mới.

## 🎯 Sử dụng

### Quản lý Features (Tính năng chính)

1. **Thêm Feature mới**:
   - Click "Thêm Feature"
   - Nhập:
     - Feature Key: `ram-optimization` (kebab-case)
     - Feature Name: `RAM Profile Optimization`
     - Section: `Optimize`
     - Description: Mô tả tính năng
   - Click "Thêm"

2. **Sửa Feature**:
   - Click icon bút bên cạnh feature
   - Chỉnh sửa thông tin
   - Click "Cập nhật"

3. **Xóa Feature**:
   - Click icon thùng rác
   - Xác nhận xóa (tất cả profiles sẽ bị xóa theo)

### Quản lý Profiles (File kích hoạt)

1. **Thêm Profile**:
   - Mở rộng feature (click icon mũi tên)
   - Click "Thêm Profile"
   - Nhập:
     - Profile Key: `8gb` (kebab-case)
     - Profile Name: `8GB RAM`
     - File Path: Chọn từ scanner hoặc nhập thủ công
     - Sort Order: Thứ tự hiển thị
     - Enabled: Bật/tắt profile
   - Click "Thêm"

2. **Sửa Profile**:
   - Click icon bút bên cạnh profile
   - Chỉnh sửa thông tin
   - Click "Cập nhật"

3. **Xóa Profile**:
   - Click icon thùng rác
   - Xác nhận xóa

4. **Bật/Tắt Profile**:
   - Click nút "Bật/Tắt"
   - Profile disabled sẽ không được gửi tới app

## 🔄 Đồng bộ với Electron App

Khi admin thay đổi:

1. **Backend lưu vào database**: Changes được lưu vào tables `features` và `feature_profiles`
2. **App fetch policy**: App gọi `/api/feature-manager/desktop-policy` để lấy cấu hình mới
3. **App áp dụng cấu hình**: App nhận danh sách features và profiles enabled
4. **Real-time updates**: Nếu có socket.io, changes có thể được broadcast realtime

## 📊 Database Schema

### features
```sql
- id (INT, PK)
- feature_key (VARCHAR(100), UNIQUE)
- feature_name (VARCHAR(200))
- section (VARCHAR(100))
- description (TEXT)
- created_by (INT)
- updated_by (INT)
- created_at (DATETIME)
- updated_at (DATETIME)
```

### feature_profiles
```sql
- id (INT, PK)
- feature_key (VARCHAR(100), FK → features)
- profile_key (VARCHAR(100))
- profile_name (VARCHAR(200))
- file_path (VARCHAR(500))
- enabled (BOOLEAN)
- sort_order (INT)
- created_by (INT)
- updated_by (INT)
- created_at (DATETIME)
- updated_at (DATETIME)
```

### feature_audit_log
```sql
- id (INT, PK)
- action (ENUM: CREATE, UPDATE, DELETE, ENABLE, DISABLE)
- entity_type (ENUM: FEATURE, PROFILE)
- entity_key (VARCHAR(100))
- old_value (JSON)
- new_value (JSON)
- changed_by (INT)
- changed_at (DATETIME)
- ip_address (VARCHAR(45))
```

## 🚀 API Endpoints

### Features
- `GET /api/feature-manager/features` - List all features with profiles
- `POST /api/feature-manager/features` - Create feature
- `PATCH /api/feature-manager/features/:key` - Update feature
- `DELETE /api/feature-manager/features/:key` - Delete feature

### Profiles
- `POST /api/feature-manager/features/:key/profiles` - Add profile to feature
- `PATCH /api/feature-manager/features/:key/profiles/:profileKey` - Update profile
- `DELETE /api/feature-manager/features/:key/profiles/:profileKey` - Delete profile

### Utilities
- `GET /api/feature-manager/scan` - Scan scripts directory
- `GET /api/feature-manager/desktop-policy` - Get policy for Electron app

## ⚠️ Lưu ý quan trọng

1. **File path phải tồn tại**: Backend sẽ validate file tồn tại trong `resources/scripts/` trước khi accept
2. **Key format**: Key phải là kebab-case (lowercase, numbers, hyphens only)
3. **Cascading delete**: Xóa feature sẽ xóa tất cả profiles của feature đó
4. **Audit logs**: Tất cả changes được log để trace nếu cần
5. **Security**: Không upload file trực tiếp từ UI, dùng file manager hoặc đặt file thủ công vào thư mục scripts

## 📱 Phiên bản cuối cùng

- **Database Schema**: `20260912_feature_profiles.sql`
- **Data**: `20260912_populate_features.sql`
- **Backend**: `featureManager.router.js`
- **Frontend**: `FeatureManagerTab.jsx`
- **Models**: `feature.model.js`, `featureProfile.model.js`, `featureAuditLog.model.js`

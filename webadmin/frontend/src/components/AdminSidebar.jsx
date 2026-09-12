import { Gauge, Users, FileText, Globe, HardDrives, ShieldCheck, SignOut, FolderSimple, Layers } from "@phosphor-icons/react";

export default function AdminSidebar({ activeTab, setActiveTab, dbHealth, onLogout }) {
  const items = [
    ["dashboard", Gauge, "Dashboard Tổng quan"],
    ["users", Users, "Quản lý Người dùng & Key"],
    ["devices", HardDrives, "Danh sách thiết bị"],
    ["logs", FileText, "Nhật ký Kích hoạt & IP"],
    ["download", Globe, "Web Tải App & Test Key"],
    ["files", FolderSimple, "Quản lý File & Chức năng"],
    ["features", Layers, "Quản lý Tính năng & Profiles"],
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand-icon">
          <ShieldCheck size={26} weight="fill" />
        </div>
        <div className="sidebar-brand-text">
          <h2>DAWA ADMIN</h2>
          <p>User &amp; Key Manager</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        {items.map(([key, Icon, label]) => (
          <button
            key={key}
            className={`nav-item ${activeTab === key ? "active" : ""}`}
            onClick={() => setActiveTab(key)}
          >
            <span className="nav-icon">
              <Icon size={20} weight="duotone" />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="db-status-pill">
          <span className={`status-dot ${dbHealth.success ? "connected" : "disconnected"}`} />
          <span>DB: {dbHealth.success ? "Sequelize ORM Ready" : "Disconnected"}</span>
        </div>
        <button className="nav-item logout-button" type="button" onClick={onLogout}>
          <span className="nav-icon">
            <SignOut size={20} weight="duotone" />
          </span>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}

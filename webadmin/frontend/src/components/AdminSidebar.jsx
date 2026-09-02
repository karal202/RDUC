export default function AdminSidebar({ activeTab, setActiveTab, dbHealth }) {
  const items = [
    ["dashboard", "📊", "Dashboard Tổng quan"],
    ["users", "👤", "Quản lý Người dùng & Key"],
    ["logs", "📜", "Nhật ký Kích hoạt & IP"],
    ["download", "🌐", "Web Tải App & Test Key"],
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand-icon">🛡️</div>
        <div className="sidebar-brand-text"><h2>DAWA ADMIN</h2><p>User & Key Manager</p></div>
      </div>
      <nav className="sidebar-nav">
        {items.map(([key, icon, label]) => (
          <button key={key} className={`nav-item ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>
            <span className="nav-icon">{icon}</span><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="db-status-pill">
          <span className={`status-dot ${dbHealth.success ? "connected" : "disconnected"}`} />
          <span>DB: {dbHealth.success ? "Sequelize ORM Ready" : "Disconnected"}</span>
        </div>
      </div>
    </aside>
  );
}

export default function DashboardTab({ dashboard, loading, loadData, setActiveTab }) {
  return <>
    <div className="stats-grid">
      <div className="stat-card"><span className="stat-label">Tổng Người dùng / Key</span><span className="stat-value">{dashboard.licensesCount || 0}</span></div>
      <div className="stat-card"><span className="stat-label">Key Đang Active</span><span className="stat-value" style={{ color: "#6ee7b7" }}>{dashboard.activeCount || 0}</span></div>
      <div className="stat-card"><span className="stat-label">Key Bị Revoked / Vô hiệu</span><span className="stat-value" style={{ color: "#fda4af" }}>{dashboard.revokedCount || 0}</span></div>
    </div>
    <div className="panel"><div className="panel-header"><h3>⚡ Thao tác nhanh</h3></div><div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
      <button className="btn-primary" onClick={() => setActiveTab("users")}>👤 Thêm Người dùng & Cấp Key Mới</button>
      <button className="btn-secondary" onClick={() => setActiveTab("logs")}>📜 Tra cứu IP Thiết bị Kích hoạt</button>
      <button className="btn-secondary" onClick={loadData} disabled={loading}>🔄 {loading ? "Đang tải..." : "Làm mới Dữ liệu"}</button>
    </div></div>
  </>;
}

import { Key, CheckCircle, XCircle, Activity, Users, ScrollText, Zap } from "@phosphor-icons/react";

export default function DashboardTab({ dashboard, loading, setActiveTab }) {
  return <>
    <div className="stats-grid">
      <div className="stat-card stat-total">
        <div className="stat-head">
          <div className="stat-icon"><Key size={20} weight="duotone" /></div>
          <span className="stat-label">Tổng Người dùng / Key</span>
        </div>
        <span className="stat-value">{dashboard.licensesCount || 0}</span>
      </div>
      <div className="stat-card stat-active">
        <div className="stat-head">
          <div className="stat-icon"><CheckCircle size={20} weight="duotone" /></div>
          <span className="stat-label">Key Đang Active</span>
        </div>
        <span className="stat-value">{dashboard.activeCount || 0}</span>
      </div>
      <div className="stat-card stat-revoked">
        <div className="stat-head">
          <div className="stat-icon"><XCircle size={20} weight="duotone" /></div>
          <span className="stat-label">Key Bị Revoked / Vô hiệu</span>
        </div>
        <span className="stat-value">{dashboard.revokedCount || 0}</span>
      </div>
      <div className="stat-card stat-logs">
        <div className="stat-head">
          <div className="stat-icon"><Activity size={20} weight="duotone" /></div>
          <span className="stat-label">Tổng Số Lần Kích hoạt</span>
        </div>
        <span className="stat-value">{dashboard.logsCount || 0}</span>
      </div>
    </div>
    <div className="panel">
      <div className="panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Zap size={18} weight="fill" style={{ color: "var(--accent)" }} />
          <h3>Thao tác nhanh</h3>
        </div>
      </div>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button className="btn-primary" onClick={() => setActiveTab("users")}>
          <Users size={16} weight="duotone" />
          <span>Thêm Người dùng &amp; Cấp Key Mới</span>
        </button>
        <button className="btn-secondary" onClick={() => setActiveTab("logs")}>
          <ScrollText size={16} weight="duotone" />
          <span>Tra cứu IP Thiết bị Kích hoạt</span>
        </button>
      </div>
      {loading && <div style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 13 }}>Đang đồng bộ dữ liệu realtime…</div>}
    </div>
  </>;
}

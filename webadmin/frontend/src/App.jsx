import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const SOCKET_URL = "http://localhost:3069";

const API_BASE = "http://localhost:3069/api/license";

const defaultLicenseForm = {
  customer_name: "",
  customer_contact: "",
  key_code: "",
  max_devices: 1,
  expires_at: "",
  created_by: 1,
  note: "",
};

const defaultValidationForm = {
  key_code: "",
  device_hash: "",
  device_name: "",
  os_info: "",
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
};

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboard, setDashboard] = useState({});
  const [licenses, setLicenses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [dbHealth, setDbHealth] = useState({ success: false, database: "checking" });

  const [licenseForm, setLicenseForm] = useState(defaultLicenseForm);
  const [validationForm, setValidationForm] = useState(defaultValidationForm);

  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);

  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [ipFilter, setIpFilter] = useState("");

  const [socketConnected, setSocketConnected] = useState(false);
  const [realtimeFlash, setRealtimeFlash] = useState(false);
  const socketRef = useRef(null);

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      throw new Error("Server trả về dữ liệu không hợp lệ", { cause: parseErr });
    }

    if (!res.ok) {
      throw new Error(json?.message || "Request failed");
    }

    return json;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, statsRes, licensesRes, logsRes] = await Promise.all([
        fetchJson(`${API_BASE}/health`).catch(() => ({ success: false, database: "disconnected" })),
        fetchJson(`${API_BASE}/dashboard`),
        fetchJson(`${API_BASE}/licenses`),
        fetchJson(`${API_BASE}/logs`),
      ]);

      setDbHealth(healthRes);
      setDashboard(statsRes.data || {});
      setLicenses(licensesRes.data || []);
      setLogs(logsRes.data || []);
    } catch (loadErr) {
      setStatusMessage({ type: "error", text: loadErr.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        loadData();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  // Socket.io realtime connection
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("license_updated", () => {
      // Flash indicator
      setRealtimeFlash(true);
      setTimeout(() => setRealtimeFlash(false), 1200);
      // Reload data immediately — no polling needed
      loadData();
    });

    return () => {
      socket.disconnect();
    };
  }, [loadData]);

  const generateKeyCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let raw = "";
    for (let i = 0; i < 12; i += 1) {
      raw += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  };

  const submitLicense = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...licenseForm,
        max_devices: Number(licenseForm.max_devices),
        created_by: Number(licenseForm.created_by),
      };

      const result = await fetchJson(`${API_BASE}/licenses`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setLicenseForm({
        ...defaultLicenseForm,
        key_code: result?.data?.key || "",
      });
      setStatusMessage({ type: "success", text: `Đã cấp Key cho người dùng [${payload.customer_name || 'mới'}]: ${result.data.key}` });
      await loadData();
    } catch (error) {
      setStatusMessage({ type: "error", text: error.message });
    }
  };

  const toggleLicenseStatus = async (licenseId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "disabled" : "active";
    try {
      await fetchJson(`${API_BASE}/licenses/${licenseId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      setStatusMessage({ type: "success", text: `Đã đổi trạng thái Key ID #${licenseId} thành [${newStatus}]` });
      await loadData();
    } catch (error) {
      setStatusMessage({ type: "error", text: error.message });
    }
  };

  const resetBoundIp = async (licenseId, customerName) => {
    if (!confirm(`Đảm bảo khách hàng [${customerName || 'ID ' + licenseId}] đã đổi IP công khai mới. Đồng ý reset IP cho Key #${licenseId}?`)) return;
    try {
      await fetchJson(`${API_BASE}/licenses/${licenseId}`, {
        method: "PUT",
        body: JSON.stringify({ reset_bound_ip: true }),
      });
      setStatusMessage({ type: "success", text: `✅ Đã mở khóa IP cho Key ID #${licenseId}. Khách hàng có thể kích hoạt trên IP mới.` });
      await loadData();
    } catch (error) {
      setStatusMessage({ type: "error", text: error.message });
    }
  };

  const submitValidation = async (event) => {
    event.preventDefault();
    try {
      const result = await fetchJson(`${API_BASE}/validate`, {
        method: "POST",
        body: JSON.stringify({
          ...validationForm,
          device_hash: validationForm.device_hash || "TEST-HWID-001",
        }),
      });

      setStatusMessage({ type: result.valid ? "success" : "error", text: result.message });
      setValidationForm(defaultValidationForm);
      await loadData();
    } catch (error) {
      setStatusMessage({ type: "error", text: error.message });
    }
  };

  const filteredUserLicenses = useMemo(() => {
    if (!userSearchTerm.trim()) return licenses;
    const term = userSearchTerm.trim().toLowerCase();
    return licenses.filter((item) => {
      const name = (item.customer_name || "").toLowerCase();
      const contact = (item.customer_contact || "").toLowerCase();
      const key = (item.key_code || "").toLowerCase();
      const note = (item.note || "").toLowerCase();
      const ipMatch = (item.active_devices || []).some(
        (dev) => dev.device_name?.toLowerCase().includes(term) || dev.device_hash?.toLowerCase().includes(term)
      );
      return name.includes(term) || contact.includes(term) || key.includes(term) || note.includes(term) || ipMatch;
    });
  }, [licenses, userSearchTerm]);

  const filteredLogs = useMemo(() => {
    if (!ipFilter.trim()) return logs;
    const filter = ipFilter.trim().toLowerCase();
    return logs.filter(
      (log) =>
        (log.ip_address && log.ip_address.toLowerCase().includes(filter)) ||
        (log.device_hash && log.device_hash.toLowerCase().includes(filter)) ||
        (log.key_code && log.key_code.toLowerCase().includes(filter))
    );
  }, [logs, ipFilter]);

  return (
    <div className="admin-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand-icon">🛡️</div>
          <div className="sidebar-brand-text">
            <h2>DAWA ADMIN</h2>
            <p>User & Key Manager</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <span className="nav-icon">📊</span>
            <span>Dashboard Tổng quan</span>
          </button>

          <button
            className={`nav-item ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <span className="nav-icon">👤</span>
            <span>Quản lý Người dùng & Key</span>
          </button>

          <button
            className={`nav-item ${activeTab === "logs" ? "active" : ""}`}
            onClick={() => setActiveTab("logs")}
          >
            <span className="nav-icon">📜</span>
            <span>Nhật ký Kích hoạt & IP</span>
          </button>

          <button
            className={`nav-item ${activeTab === "download" ? "active" : ""}`}
            onClick={() => setActiveTab("download")}
          >
            <span className="nav-icon">🌐</span>
            <span>Web Tải App & Test Key</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="db-status-pill">
            <span className={`status-dot ${dbHealth.success ? "connected" : "disconnected"}`}></span>
            <span>DB: {dbHealth.success ? "Sequelize ORM Ready" : "Disconnected"}</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h1 style={{ margin: 0 }}>
              {activeTab === "dashboard" && "📊 Dashboard Tổng quan"}
              {activeTab === "users" && "👤 Quản lý Người dùng & Key Bản quyền"}
              {activeTab === "logs" && "📜 Nhật ký Kích hoạt & Tra cứu IP Máy"}
              {activeTab === "download" && "🌐 Web Tải File .EXE & Công cụ Validate"}
            </h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 10px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.5px",
                background: realtimeFlash
                  ? "rgba(110,231,183,0.25)"
                  : socketConnected
                  ? "rgba(110,231,183,0.12)"
                  : "rgba(248,113,113,0.12)",
                border: `1px solid ${realtimeFlash ? "#6ee7b7" : socketConnected ? "rgba(110,231,183,0.4)" : "rgba(248,113,113,0.4)"}`,
                color: realtimeFlash ? "#6ee7b7" : socketConnected ? "#6ee7b7" : "#fca5a5",
                transition: "all 0.3s ease",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: realtimeFlash ? "#6ee7b7" : socketConnected ? "#6ee7b7" : "#fca5a5",
                  boxShadow: socketConnected ? "0 0 6px #6ee7b7" : "none",
                  animation: socketConnected ? "pulse 1.5s infinite" : "none",
                  display: "inline-block",
                }}
              />
              {realtimeFlash ? "⚡ CẬP NHẬT!" : socketConnected ? "LIVE" : "OFFLINE"}
            </span>
          </div>
          <p>Hệ thống Quản trị Bản quyền Kích hoạt Hardware Bound DAWA System</p>
        </header>

        {statusMessage.text && (
          <div className={`status-toast ${statusMessage.type}`}>
            <span>{statusMessage.type === "success" ? "✅" : "⚠️"}</span>
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Tổng Người dùng / Key</span>
                <span className="stat-value">{dashboard.licensesCount || 0}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Key Đang Active</span>
                <span className="stat-value" style={{ color: "#6ee7b7" }}>{dashboard.activeCount || 0}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Key Bị Revoked / Vô hiệu</span>
                <span className="stat-value" style={{ color: "#fda4af" }}>{dashboard.revokedCount || 0}</span>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h3>⚡ Thao tác nhanh</h3>
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button className="btn-primary" onClick={() => setActiveTab("users")}>
                  👤 Thêm Người dùng & Cấp Key Mới
                </button>
                <button className="btn-secondary" onClick={() => setActiveTab("logs")}>
                  📜 Tra cứu IP Thiết bị Kích hoạt
                </button>
                <button className="btn-secondary" onClick={() => loadData()} disabled={loading}>
                  🔄 {loading ? "Đang tải..." : "Làm mới Dữ liệu"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User & Key Management Tab */}
        {activeTab === "users" && (
          <div>
            <div className="panel">
              <div className="panel-header">
                <h3>➕ Thêm Người dùng & Cấp License Key Mới</h3>
              </div>
              <form onSubmit={submitLicense} className="form-grid two-col">
                <div className="form-group">
                  <label>Tên Người dùng / Khách hàng (*)</label>
                  <input
                    placeholder="VD: Nguyễn Văn A"
                    value={licenseForm.customer_name}
                    onChange={(e) => setLicenseForm({ ...licenseForm, customer_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Liên hệ (SĐT / Email / Telegram)</label>
                  <input
                    placeholder="VD: 0987654321 hoặc user@gmail.com"
                    value={licenseForm.customer_contact}
                    onChange={(e) => setLicenseForm({ ...licenseForm, customer_contact: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Mã Key (để trống để tự động sinh 12 ký tự)</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      style={{ flex: 1 }}
                      placeholder="XXXX-XXXX-XXXX"
                      value={licenseForm.key_code}
                      onChange={(e) => setLicenseForm({ ...licenseForm, key_code: e.target.value })}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setLicenseForm({ ...licenseForm, key_code: generateKeyCode() })}
                    >
                      Sinh Key
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Giới hạn số máy tính (HWID Max)</label>
                  <input
                    type="number"
                    min="1"
                    value={licenseForm.max_devices}
                    onChange={(e) => setLicenseForm({ ...licenseForm, max_devices: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Ngày hết hạn (để trống = Vĩnh viễn)</label>
                  <input
                    type="datetime-local"
                    value={licenseForm.expires_at}
                    onChange={(e) => setLicenseForm({ ...licenseForm, expires_at: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Ghi chú người dùng</label>
                  <input
                    placeholder="Ghi chú (Ví dụ: Khách mua gói 1 năm)"
                    value={licenseForm.note}
                    onChange={(e) => setLicenseForm({ ...licenseForm, note: e.target.value })}
                  />
                </div>

                <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="btn-primary">
                    🚀 Lưu & Cấp Key Cho Người Dùng
                  </button>
                </div>
              </form>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h3>👥 Danh sách Người Dùng & Key Tương Ứng</h3>
                <input
                  style={{ width: "300px" }}
                  placeholder="🔍 Tìm theo Tên, SĐT, Key, IP..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>TÊN NGƯỜI DÙNG / KHÁCH HÀNG</th>
                      <th>SĐT / LIÊN HỆ</th>
                      <th>MÃ KEY DÀNH CHO NGƯỜI DÙNG</th>
                      <th>TRẠNG THÁI</th>
                      <th>IP RÀNG BUỘC (DUY NHẤT)</th>
                      <th>MÁY & HWID ĐÃ KÍCH HOẠT</th>
                      <th>HẾT HẠN</th>
                      <th>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUserLicenses.map((item) => (
                      <tr key={item.id}>
                        <td>#{item.id}</td>
                        <td>
                          <strong style={{ color: "#ffffff", fontSize: "14px" }}>{item.customer_name}</strong>
                          {item.note && <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>📝 {item.note}</div>}
                        </td>
                        <td>
                          <span style={{ color: "var(--accent-primary)", fontSize: "12px" }}>{item.customer_contact}</span>
                        </td>
                        <td>
                          <span className="key-code-display">{item.key_code}</span>
                        </td>
                        <td>
                          <span className={`badge ${item.status}`}>{item.status}</span>
                        </td>
                        <td>
                          {item.bound_ip_address ? (
                            <div>
                              <span className="ip-tag bound">🔒 {item.bound_ip_address}</span>
                              <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "4px" }}>
                                Chỉ kích hoạt được từ IP này
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                              <span style={{ fontSize: "11px", opacity: 0.7 }}>Chưa gắn IP</span>
                              <br />
                              <span style={{ fontSize: "10px" }}>(IP sẽ ghi nhận lần đầu kích hoạt)</span>
                            </span>
                          )}
                        </td>
                        <td>
                          {item.active_devices && item.active_devices.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              {item.active_devices.map((dev) => (
                                <div key={dev.device_id} style={{ fontSize: "12px" }}>
                                  <strong>{dev.device_name || "PC"}: </strong>
                                  <span className="ip-tag">{dev.device_hash?.slice(0, 8)}...</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>Chưa kích hoạt</span>
                          )}
                        </td>
                        <td>{formatDate(item.expires_at)}</td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <button
                              className="btn-secondary"
                              style={{ fontSize: "11px", padding: "4px 8px" }}
                              onClick={() => toggleLicenseStatus(item.id, item.status)}
                            >
                              {item.status === "active" ? "🔒 Vô hiệu" : "🔓 Mở lại"}
                            </button>
                            {item.bound_ip_address && (
                              <button
                                className="btn-secondary"
                                style={{
                                  fontSize: "11px",
                                  padding: "4px 8px",
                                  background: "rgba(22, 119, 255, 0.1)",
                                  borderColor: "rgba(22, 119, 255, 0.25)",
                                  color: "var(--accent-primary)",
                                }}
                                onClick={() => resetBoundIp(item.id, item.customer_name)}
                              >
                                🔄 Reset IP
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Activation Logs Tab */}
        {activeTab === "logs" && (
          <div>
            <div className="panel">
              <div className="panel-header">
                <h3>🔍 Tra cứu Nhật ký theo IP Máy / HWID / Key</h3>
              </div>
              <div className="form-group">
                <input
                  placeholder="Nhập IP Máy (VD: 192.168.1.1 hoặc 127.0.0.1) hoặc Mã HWID..."
                  value={ipFilter}
                  onChange={(e) => setIpFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h3>📜 Nhật ký Kích hoạt & Địa chỉ IP Trực tiếp</h3>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>IP MÁY TÍNH (IP ADDRESS)</th>
                      <th>MÃ KEY NHẬP VÀO</th>
                      <th>MÃ PHẦN CỨNG (HWID)</th>
                      <th>KẾT QUẢ XÁC THỰC</th>
                      <th>THỜI GIAN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td>#{log.id}</td>
                        <td>
                          <span className="ip-tag">🌐 {log.ip_address || "127.0.0.1"}</span>
                        </td>
                        <td>
                          <span className="key-code-display">{log.key_code || "—"}</span>
                        </td>
                        <td style={{ fontSize: "12px", fontFamily: "monospace" }}>
                          {log.device_hash ? `${log.device_hash.slice(0, 16)}...` : "—"}
                        </td>
                        <td>
                          <span className={`badge ${log.result}`}>{log.result}</span>
                        </td>
                        <td>{formatDate(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Web Tải & Validation Test Tab */}
        {activeTab === "download" && (
          <div>
            <div className="panel" style={{ background: "linear-gradient(135deg, #101625, #1e293b)" }}>
              <div className="panel-header">
                <h3>🌐 Web Tải Ứng Dụng Tĩnh</h3>
              </div>
              <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>
                Người dùng bấm tải file .exe từ trang web tĩnh, cài đặt và mở app desktop lên nhập Key kích hoạt do Admin cấp.
              </p>
              <div style={{ display: "flex", gap: "12px" }}>
                <a className="btn-primary" href="/downloads/dawa-system-check-1.0.0.exe" download style={{ textDecoration: "none" }}>
                  🚀 Tải File .EXE Ứng Dụng (Static Web)
                </a>
                <button className="btn-secondary" onClick={() => setShowKeyModal(true)}>
                  🔐 Test Nhập Key Kích Hoạt qua API
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Test Validation Modal */}
        {showKeyModal && (
          <div className="modal-overlay" onClick={() => setShowKeyModal(false)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Test API Validate Key</h3>
              </div>
              <form onSubmit={submitValidation} className="form-grid">
                <div className="form-group">
                  <label>License Key</label>
                  <input
                    placeholder="XXXX-XXXX-XXXX"
                    value={validationForm.key_code}
                    onChange={(e) => setValidationForm({ ...validationForm, key_code: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>HWID Thiết bị (Device Hash)</label>
                  <input
                    placeholder="HWID Hash"
                    value={validationForm.device_hash}
                    onChange={(e) => setValidationForm({ ...validationForm, device_hash: e.target.value })}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowKeyModal(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn-primary">
                    Gửi Kiểm tra Key
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

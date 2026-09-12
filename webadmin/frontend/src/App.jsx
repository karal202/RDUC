import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";
import { API_BASE, BACKEND_URL, fetchJson, loadLicenseData } from "./api/licenseApi";
import AdminSidebar from "./components/AdminSidebar";
import DashboardTab from "./components/DashboardTab";
import UsersTab from "./components/UsersTab";
import DevicesTab from "./components/DevicesTab";
import LogsTab from "./components/LogsTab";
import DownloadTab from "./components/DownloadTab";
import FileManagerTab from "./components/FileManagerTab";
import FeatureManagerTab from "./components/FeatureManagerTab";
import ValidationModal from "./components/ValidationModal";
import AdminLogin from "./components/AdminLogin";
import { Gauge, Users, FileText, Globe, HardDrives, CheckCircle, XCircle, Broadcast, Wrench, Stack } from "@phosphor-icons/react";

const SOCKET_URL = BACKEND_URL;
const defaultLicenseForm = { customer_name: "", customer_contact: "", key_code: "", max_devices: 1, expires_at: "", created_by: 1, note: "" };
const defaultValidationForm = { key_code: "", device_hash: "", device_name: "", os_info: "" };
const formatDate = (value) => { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN"); };

const titleConfig = {
  files: { Icon: FileText, label: "Quản lý File & Chức năng" },
  features: { Icon: Stack, label: "Quản lý Tính năng & Profiles" },
  dashboard: { Icon: Gauge, label: "Dashboard Tổng quan" },
  users: { Icon: Users, label: "Quản lý Người dùng & Key" },
  devices: { Icon: HardDrives, label: "Danh sách thiết bị" },
  logs: { Icon: FileText, label: "Nhật ký Kích hoạt & IP" },
  download: { Icon: Globe, label: "Web Tải App & Test Key" },
};

function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboard, setDashboard] = useState({});
  const [licenses, setLicenses] = useState([]);
  const [devices, setDevices] = useState([]);
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
  const logout = () => {
    localStorage.removeItem("accessToken");
    onLogout();
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try { const data = await loadLicenseData(); setDbHealth(data.health); setDashboard(data.dashboard); setLicenses(data.licenses); setLogs(data.logs); setDevices(data.devices); }
    catch { /* swallow transient network error; toast set below if needed */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadData();
    });
    return () => { cancelled = true; };
  }, [loadData]);
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["polling", "websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });
    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("connect_error", (err) => {
      console.warn("[SOCKET.IO] Connection error:", err.message);
    });
    socket.on("license_updated", () => {
      setRealtimeFlash(true);
      setTimeout(() => setRealtimeFlash(false), 1200);
      loadData();
    });
    return () => socket.disconnect();
  }, [loadData]);

  const generateKey = () => { const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let raw = ""; for (let index = 0; index < 12; index += 1) raw += chars[Math.floor(Math.random() * chars.length)]; return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`; };
  const setError = (error) => setStatusMessage({ type: "error", text: error.message });
  const submitLicense = async (event) => { event.preventDefault(); try { const payload = { ...licenseForm, max_devices: Number(licenseForm.max_devices), created_by: Number(licenseForm.created_by) }; const result = await fetchJson(`${API_BASE}/licenses`, { method: "POST", body: JSON.stringify(payload) }); setLicenseForm({ ...defaultLicenseForm, key_code: result?.data?.key || "" }); setStatusMessage({ type: "success", text: `Đã cấp Key: ${result.data.key}` }); await loadData(); } catch (error) { setError(error); } };
  const toggleLicenseStatus = async (id, status) => { try { const newStatus = status === "active" ? "disabled" : "active"; await fetchJson(`${API_BASE}/licenses/${id}`, { method: "PUT", body: JSON.stringify({ status: newStatus }) }); await loadData(); } catch (error) { setError(error); } };
  const deleteLicense = async (id, name) => { if (!confirm(`Xóa vĩnh viễn Key của ${name || id}? Người dùng đang sử dụng Key sẽ bị đăng xuất ngay.`)) return; try { await fetchJson(`${API_BASE}/licenses/${id}`, { method: "DELETE" }); setStatusMessage({ type: "success", text: "Đã xóa Key và ngắt quyền sử dụng realtime." }); await loadData(); } catch (error) { setError(error); } };
  const resetBoundIp = async (id, name) => { if (!confirm(`Đồng ý reset IP cho Key của ${name || id}?`)) return; try { await fetchJson(`${API_BASE}/licenses/${id}`, { method: "PUT", body: JSON.stringify({ reset_bound_ip: true }) }); await loadData(); } catch (error) { setError(error); } };
  const blockHardware = async (hardwareId, deviceName) => { if (!confirm(`Chặn phần cứng ${deviceName || hardwareId}? Thiết bị này sẽ không thể kích hoạt hoặc dùng lại key.`)) return; try { await fetchJson(`${API_BASE}/hardware-blocks`, { method: "POST", body: JSON.stringify({ hardware_id: hardwareId, reason: "Admin chặn từ danh sách key" }) }); setStatusMessage({ type: "success", text: "Đã chặn phần cứng." }); await loadData(); } catch (error) { setError(error); } };
  const unblockHardware = async (hardwareId, deviceName) => { if (!confirm(`Mở lại phần cứng ${deviceName || hardwareId}? Thiết bị có thể kích hoạt lại key.`)) return; try { await fetchJson(`${API_BASE}/hardware-blocks/${encodeURIComponent(hardwareId)}`, { method: "DELETE" }); setStatusMessage({ type: "success", text: "Đã mở lại phần cứng." }); await loadData(); } catch (error) { setError(error); } };
  const submitValidation = async (event) => { event.preventDefault(); try { const result = await fetchJson(`${API_BASE}/validate`, { method: "POST", body: JSON.stringify({ ...validationForm, device_hash: validationForm.device_hash || "TEST-HWID-001" }) }); setStatusMessage({ type: result.valid ? "success" : "error", text: result.message }); setValidationForm(defaultValidationForm); await loadData(); setShowKeyModal(false); } catch (error) { setError(error); } };
  const { Icon: TitleIcon, label: titleLabel } = titleConfig[activeTab] || titleConfig.dashboard;

  return <div className="admin-container">
    <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} dbHealth={dbHealth} onLogout={logout} />
    <main className="main-content">
      <header className="top-header">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div className="h1-icon">
            <TitleIcon size={22} weight="duotone" />
          </div>
          <div>
            <h1>{titleLabel}</h1>
            <p>Hệ thống Quản trị Bản quyền Kích hoạt Hardware Bound DAWA System</p>
          </div>
        </div>
        <span className={`status-badge ${socketConnected ? "activated" : "idle"}`}>
          {realtimeFlash
            ? <><Broadcast size={14} weight="fill" /> CẬP NHẬT!</>
            : socketConnected
              ? <><Broadcast size={14} weight="fill" /> LIVE</>
              : <><Wrench size={14} weight="fill" /> OFFLINE</>}
        </span>
      </header>
      {statusMessage.text && <div className={`status-toast ${statusMessage.type}`}>
        {statusMessage.type === "success" ? <CheckCircle size={18} weight="duotone" /> : <XCircle size={18} weight="duotone" />}
        <span>{statusMessage.text}</span>
      </div>}
      {activeTab === "dashboard" && <DashboardTab dashboard={dashboard} loading={loading} setActiveTab={setActiveTab} />}
      {activeTab === "users" && <UsersTab form={licenseForm} setForm={setLicenseForm} licenses={licenses} searchTerm={userSearchTerm} setSearchTerm={setUserSearchTerm} onSubmit={submitLicense} onToggle={toggleLicenseStatus} onDelete={deleteLicense} onReset={resetBoundIp} generateKey={generateKey} formatDate={formatDate} />}
      {activeTab === "devices" && <DevicesTab devices={devices} onBlock={blockHardware} onUnblock={unblockHardware} />}
      {activeTab === "logs" && <LogsTab logs={logs} filter={ipFilter} setFilter={setIpFilter} formatDate={formatDate} />}
      {activeTab === "download" && <DownloadTab onOpenValidation={() => setShowKeyModal(true)} />}
      {activeTab === "files" && <FileManagerTab onStatus={setStatusMessage} />}
      {activeTab === "features" && <FeatureManagerTab onStatus={setStatusMessage} />}
      {showKeyModal && <ValidationModal form={validationForm} setForm={setValidationForm} onSubmit={submitValidation} onClose={() => setShowKeyModal(false)} />}
    </main>
  </div>;
}

function App() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem("accessToken")));

  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem("accessToken");
      setAuthenticated(false);
    };

    window.addEventListener("auth-expired", handleAuthExpired);
    return () => window.removeEventListener("auth-expired", handleAuthExpired);
  }, []);

  if (!authenticated) {
    return <AdminLogin onLogin={() => setAuthenticated(true)} />;
  }

  return <AdminDashboard onLogout={() => setAuthenticated(false)} />;
}

export default App;

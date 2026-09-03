import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";
import { API_BASE, BACKEND_URL, fetchJson, loadLicenseData } from "./api/licenseApi";
import AdminSidebar from "./components/AdminSidebar";
import DashboardTab from "./components/DashboardTab";
import UsersTab from "./components/UsersTab";
import LogsTab from "./components/LogsTab";
import DownloadTab from "./components/DownloadTab";
import ValidationModal from "./components/ValidationModal";

const SOCKET_URL = BACKEND_URL;
const defaultLicenseForm = { customer_name: "", customer_contact: "", key_code: "", max_devices: 1, expires_at: "", created_by: 1, note: "" };
const defaultValidationForm = { key_code: "", device_hash: "", device_name: "", os_info: "" };
const formatDate = (value) => { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN"); };

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try { const data = await loadLicenseData(); setDbHealth(data.health); setDashboard(data.dashboard); setLicenses(data.licenses); setLogs(data.logs); }
    catch (error) { setStatusMessage({ type: "error", text: error.message }); }
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
    const socket = io(SOCKET_URL, { transports: ["websocket"], reconnectionDelay: 1000, reconnectionDelayMax: 5000 });
    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("license_updated", () => { setRealtimeFlash(true); setTimeout(() => setRealtimeFlash(false), 1200); loadData(); });
    return () => socket.disconnect();
  }, [loadData]);

  const generateKey = () => { const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let raw = ""; for (let index = 0; index < 12; index += 1) raw += chars[Math.floor(Math.random() * chars.length)]; return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`; };
  const setError = (error) => setStatusMessage({ type: "error", text: error.message });
  const submitLicense = async (event) => { event.preventDefault(); try { const payload = { ...licenseForm, max_devices: Number(licenseForm.max_devices), created_by: Number(licenseForm.created_by) }; const result = await fetchJson(`${API_BASE}/licenses`, { method: "POST", body: JSON.stringify(payload) }); setLicenseForm({ ...defaultLicenseForm, key_code: result?.data?.key || "" }); setStatusMessage({ type: "success", text: `Đã cấp Key: ${result.data.key}` }); await loadData(); } catch (error) { setError(error); } };
  const toggleLicenseStatus = async (id, status) => { try { const newStatus = status === "active" ? "disabled" : "active"; await fetchJson(`${API_BASE}/licenses/${id}`, { method: "PUT", body: JSON.stringify({ status: newStatus }) }); await loadData(); } catch (error) { setError(error); } };
  const resetBoundIp = async (id, name) => { if (!confirm(`Đồng ý reset IP cho Key của ${name || id}?`)) return; try { await fetchJson(`${API_BASE}/licenses/${id}`, { method: "PUT", body: JSON.stringify({ reset_bound_ip: true }) }); await loadData(); } catch (error) { setError(error); } };
  const submitValidation = async (event) => { event.preventDefault(); try { const result = await fetchJson(`${API_BASE}/validate`, { method: "POST", body: JSON.stringify({ ...validationForm, device_hash: validationForm.device_hash || "TEST-HWID-001" }) }); setStatusMessage({ type: result.valid ? "success" : "error", text: result.message }); setValidationForm(defaultValidationForm); await loadData(); setShowKeyModal(false); } catch (error) { setError(error); } };
  const titles = { dashboard: "📊 Dashboard Tổng quan", users: "👤 Quản lý Người dùng & Key", logs: "📜 Nhật ký Kích hoạt & IP", download: "🌐 Web Tải App & Test Key" };

  return <div className="admin-container"><AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} dbHealth={dbHealth} /><main className="main-content"><header className="top-header"><div><h1>{titles[activeTab]}</h1><p>Hệ thống Quản trị Bản quyền Kích hoạt Hardware Bound DAWA System</p></div><span className="status-badge activated">{realtimeFlash ? "⚡ CẬP NHẬT!" : socketConnected ? "LIVE" : "OFFLINE"}</span></header>{statusMessage.text && <div className={`status-toast ${statusMessage.type}`}>{statusMessage.text}</div>}{activeTab === "dashboard" && <DashboardTab dashboard={dashboard} loading={loading} loadData={loadData} setActiveTab={setActiveTab} />}{activeTab === "users" && <UsersTab form={licenseForm} setForm={setLicenseForm} licenses={licenses} searchTerm={userSearchTerm} setSearchTerm={setUserSearchTerm} onSubmit={submitLicense} onToggle={toggleLicenseStatus} onReset={resetBoundIp} generateKey={generateKey} formatDate={formatDate} />}{activeTab === "logs" && <LogsTab logs={logs} filter={ipFilter} setFilter={setIpFilter} formatDate={formatDate} />}{activeTab === "download" && <DownloadTab onOpenValidation={() => setShowKeyModal(true)} />}{showKeyModal && <ValidationModal form={validationForm} setForm={setValidationForm} onSubmit={submitValidation} onClose={() => setShowKeyModal(false)} />}</main></div>;
}

export default App;

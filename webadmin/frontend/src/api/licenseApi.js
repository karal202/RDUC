const BACKEND_URL = (import.meta.env.VITE_API_BACKEND_URL || "http://localhost:3069").replace(/\/+$/, "");
const API_BASE = `${BACKEND_URL}/api/license`;

export async function fetchJson(url, options = {}) {
  const accessToken = localStorage.getItem("accessToken");
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (parseErr) {
    throw new Error("Server trả về dữ liệu không hợp lệ", { cause: parseErr });
  }

  const serverMessage = String(json?.message || "").toLowerCase();
  if (res.status === 401 || serverMessage.includes("jwt expired") || serverMessage.includes("token expired")) {
    window.dispatchEvent(new Event("auth-expired"));
  }

  if (!res.ok) throw new Error(json?.message || "Request failed");
  return json;
}

export async function loadLicenseData() {
  let healthRes;
  try {
    healthRes = await fetchJson(`${API_BASE}/health`);
  } catch (error) {
    throw new Error("Không kết nối được với backend/database. Vui lòng kiểm tra máy chủ.", { cause: error });
  }

  if (!healthRes.success || healthRes.database !== "connected") {
    throw new Error(`Không kết nối được với database${healthRes.message ? `: ${healthRes.message}` : "."}`);
  }

  let statsRes;
  let licensesRes;
  let logsRes;
  try {
    [statsRes, licensesRes, logsRes] = await Promise.all([
      fetchJson(`${API_BASE}/dashboard`),
      fetchJson(`${API_BASE}/licenses`),
      fetchJson(`${API_BASE}/logs`),
    ]);
  } catch (error) {
    throw new Error(`Không tải được dữ liệu từ backend/database: ${error.message}`, { cause: error });
  }

  return {
    health: healthRes,
    dashboard: statsRes.data || {},
    licenses: licensesRes.data || [],
    logs: logsRes.data || [],
  };
}

export { API_BASE, BACKEND_URL };

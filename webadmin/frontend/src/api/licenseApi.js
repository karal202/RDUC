const API_BASE = "http://localhost:3069/api/license";

export async function fetchJson(url, options = {}) {
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

  if (!res.ok) throw new Error(json?.message || "Request failed");
  return json;
}

export async function loadLicenseData() {
  const [healthRes, statsRes, licensesRes, logsRes] = await Promise.all([
    fetchJson(`${API_BASE}/health`).catch(() => ({ success: false, database: "disconnected" })),
    fetchJson(`${API_BASE}/dashboard`),
    fetchJson(`${API_BASE}/licenses`),
    fetchJson(`${API_BASE}/logs`),
  ]);

  return {
    health: healthRes,
    dashboard: statsRes.data || {},
    licenses: licensesRes.data || [],
    logs: logsRes.data || [],
  };
}

export { API_BASE };

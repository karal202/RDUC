import { useState } from "react";
import { BACKEND_URL } from "../api/licenseApi";

export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok || !result?.data?.accessToken) {
        throw new Error(result?.message || "Đăng nhập thất bại");
      }
      localStorage.setItem("accessToken", result.data.accessToken);
      onLogin();
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="sidebar-brand-icon">🛡️</div>
        <h1>Đăng nhập Admin</h1>
        <p>Quản lý license và thiết bị DAWA</p>
        <label>
          Tên đăng nhập
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        </label>
        <label>
          Mật khẩu
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>
        {error && <div className="login-error">{error}</div>}
        <button className="login-submit" type="submit" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}

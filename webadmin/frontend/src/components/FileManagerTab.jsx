import { useCallback, useEffect, useState } from "react";
import { FileCode, ToggleLeft, ToggleRight, WarningCircle, CheckCircle } from "@phosphor-icons/react";
import { API_BASE, fetchJson } from "../api/licenseApi";

const formatBytes = (size) => !size ? "—" : size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(2)} MB`;

export default function FileManagerTab({ onStatus }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const managerBase = API_BASE.replace("/license", "");
  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await fetchJson(`${managerBase}/file-manager/features`)).data || []); }
    catch (error) { onStatus({ type: "error", text: error.message }); }
    finally { setLoading(false); }
  }, [managerBase, onStatus]);
  useEffect(() => { load(); }, [load]);
  const toggle = async (item) => {
    setSaving(item.key);
    try {
      const result = await fetchJson(`${managerBase}/file-manager/features/${encodeURIComponent(item.key)}`, { method: "PATCH", body: JSON.stringify({ enabled: !item.enabled }) });
      setItems((current) => current.map((entry) => entry.key === item.key ? result.data : entry));
      onStatus({ type: "success", text: `${item.key} đã ${item.enabled ? "tắt" : "bật"}.` });
    } catch (error) { onStatus({ type: "error", text: error.message }); }
    finally { setSaving(""); }
  };
  return <section className="panel file-manager-panel">
    <div className="panel-header"><div><h3>Quản lý file &amp; chức năng desktop</h3><p>Kiểm soát các file đã gắn với nút chức năng. App chỉ chạy allowlist an toàn.</p></div></div>
    {loading ? <div className="empty-state">Đang tải danh sách file…</div> : <div className="file-manager-list">
      {items.map((item) => <article className="file-manager-row" key={item.key}>
        <span className="file-state ready"><FileCode size={21} weight="duotone" /></span>
        <div className="file-manager-info"><strong>{item.key}</strong><span>{item.section} · <code>{item.file}</code> · {formatBytes(item.size)}</span><em className="linked-note">Đã liên kết với nút chức năng trong app</em>{!item.exists && <small>File desktop được đóng gói cùng app; server admin không lưu bản source này.</small>}</div>
        <span className={`feature-status ${item.enabled ? "enabled" : "disabled"}`}>{item.enabled ? <CheckCircle size={15} weight="fill" /> : <WarningCircle size={15} weight="fill" />}{item.enabled ? "Đang bật" : "Đã tắt"}</span>
        <button className="btn-secondary feature-toggle" disabled={saving === item.key} onClick={() => toggle(item)}>{item.enabled ? <ToggleRight size={21} weight="fill" /> : <ToggleLeft size={21} weight="fill" />}{item.enabled ? "Tắt" : "Bật"}</button>
      </article>)}
    </div>}
  </section>;
}

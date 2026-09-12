import { useCallback, useEffect, useState } from "react";
import { FileCode, ToggleLeft, ToggleRight, WarningCircle, CheckCircle, Plus, Pencil, Trash, FolderOpen, X } from "@phosphor-icons/react";
import { API_BASE, fetchJson } from "../api/licenseApi";

const formatBytes = (size) => !size ? "—" : size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(2)} MB`;

export default function FileManagerTab({ onStatus }) {
  const [items, setItems] = useState([]);
  const [scannedFiles, setScannedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ key: "", section: "", file_path: "", enabled: true });
  const [showScanner, setShowScanner] = useState(false);
  const managerBase = API_BASE.replace("/license", "");

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await fetchJson(`${managerBase}/file-manager/features`)).data || []); }
    catch (error) { onStatus({ type: "error", text: error.message }); }
    finally { setLoading(false); }
  }, [managerBase, onStatus]);

  const scanFiles = useCallback(async () => {
    try { setScannedFiles((await fetchJson(`${managerBase}/file-manager/scan`)).data || []); }
    catch (error) { onStatus({ type: "error", text: error.message }); }
  }, [managerBase, onStatus]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (showScanner) scanFiles(); }, [showScanner, scanFiles]);

  const toggle = async (item) => {
    setSaving(item.key);
    try {
      const result = await fetchJson(`${managerBase}/file-manager/features/${encodeURIComponent(item.key)}`, { method: "PATCH", body: JSON.stringify({ enabled: !item.enabled }) });
      setItems((current) => current.map((entry) => entry.key === item.key ? result.data : entry));
      onStatus({ type: "success", text: `${item.key} đã ${item.enabled ? "tắt" : "bật"}.` });
    } catch (error) { onStatus({ type: "error", text: error.message }); }
    finally { setSaving(""); }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ key: "", section: "", file_path: "", enabled: true });
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ key: item.key, section: item.section, file_path: item.file, enabled: item.enabled });
    setShowForm(true);
  };

  const handleDelete = async (key) => {
    if (!confirm(`Bạn có chắc muốn xóa feature "${key}"?`)) return;
    try {
      await fetchJson(`${managerBase}/file-manager/features/${encodeURIComponent(key)}`, { method: "DELETE" });
      setItems((current) => current.filter((item) => item.key !== key));
      onStatus({ type: "success", text: `Đã xóa ${key}.` });
    } catch (error) { onStatus({ type: "error", text: error.message }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving("form");
    try {
      if (editingItem) {
        const result = await fetchJson(`${managerBase}/file-manager/features/${encodeURIComponent(editingItem.key)}`, { method: "PATCH", body: JSON.stringify(formData) });
        setItems((current) => current.map((entry) => entry.key === editingItem.key ? result.data : entry));
        onStatus({ type: "success", text: `Đã cập nhật ${editingItem.key}.` });
      } else {
        const result = await fetchJson(`${managerBase}/file-manager/features`, { method: "POST", body: JSON.stringify(formData) });
        setItems((current) => [...current, result.data]);
        onStatus({ type: "success", text: `Đã thêm ${formData.key}.` });
      }
      setShowForm(false);
    } catch (error) { onStatus({ type: "error", text: error.message }); }
    finally { setSaving(""); }
  };

  const selectFile = (filePath) => {
    setFormData({ ...formData, file_path: filePath });
    setShowScanner(false);
  };

  return <section className="panel file-manager-panel">
    <div className="panel-header">
      <div>
        <h3>Quản lý file &amp; chức năng desktop</h3>
        <p>CRUD: Thêm, sửa, xóa file kích hoạt tương ứng với các mục trong app.</p>
      </div>
      <div className="panel-actions">
        <button className="btn-primary" onClick={handleAdd}><Plus size={18} weight="fill" />Thêm mới</button>
      </div>
    </div>

    {showForm && <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h4>{editingItem ? "Sửa feature" : "Thêm feature mới"}</h4>
          <button className="btn-icon" onClick={() => setShowForm(false)}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Feature Key *</label>
            <input type="text" value={formData.key} onChange={(e) => setFormData({ ...formData, key: e.target.value })} disabled={!!editingItem} placeholder="Ví dụ: network-tcp-ping" required />
          </div>
          <div className="form-group">
            <label>Section *</label>
            <input type="text" value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} placeholder="Ví dụ: Network, Input Lag, Optimize" required />
          </div>
          <div className="form-group">
            <label>File Path *</label>
            <div className="input-group">
              <input type="text" value={formData.file_path} onChange={(e) => setFormData({ ...formData, file_path: e.target.value })} placeholder="Ví dụ: Network/AckTicksandAckFrequency.reg" required />
              <button type="button" className="btn-secondary" onClick={() => setShowScanner(true)}><FolderOpen size={18} /></button>
            </div>
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={formData.enabled} onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })} />
              Enabled
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={saving === "form"}>{saving === "form" ? "Đang lưu..." : (editingItem ? "Cập nhật" : "Thêm")}</button>
          </div>
        </form>
      </div>
    </div>}

    {showScanner && <div className="modal-overlay">
      <div className="modal-content modal-large">
        <div className="modal-header">
          <h4>Chọn file từ thư mục scripts</h4>
          <button className="btn-icon" onClick={() => setShowScanner(false)}><X size={20} /></button>
        </div>
        <div className="file-scanner">
          {scannedFiles.length === 0 ? <div className="empty-state">Đang quét thư mục...</div> : 
          <div className="file-list">
            {scannedFiles.map((file) => (
              <div key={file.path} className="file-item" onClick={() => selectFile(file.path)}>
                <FileCode size={16} />
                <span>{file.path}</span>
                <small>{formatBytes(file.size)}</small>
              </div>
            ))}
          </div>}
        </div>
      </div>
    </div>}

    {loading ? <div className="empty-state">Đang tải danh sách file…</div> : <div className="file-manager-list">
      {items.map((item) => <article className="file-manager-row" key={item.key}>
        <span className={`file-state ${item.exists ? "ready" : "missing"}`}>
          <FileCode size={21} weight="duotone" />
        </span>
        <div className="file-manager-info">
          <strong>{item.key}</strong>
          <span>{item.section} · <code>{item.file}</code> · {formatBytes(item.size)}</span>
          <em className="linked-note">Đã liên kết với nút chức năng trong app</em>
          {!item.exists && <small className="warning-text">⚠️ File không tồn tại trong thư mục scripts</small>}
        </div>
        <span className={`feature-status ${item.enabled ? "enabled" : "disabled"}`}>
          {item.enabled ? <CheckCircle size={15} weight="fill" /> : <WarningCircle size={15} weight="fill" />}
          {item.enabled ? "Đang bật" : "Đã tắt"}
        </span>
        <div className="row-actions">
          <button className="btn-icon" onClick={() => handleEdit(item)} title="Sửa"><Pencil size={18} /></button>
          <button className="btn-icon" onClick={() => handleDelete(item.key)} title="Xóa"><Trash size={18} /></button>
          <button className="btn-secondary feature-toggle" disabled={saving === item.key} onClick={() => toggle(item)}>
            {item.enabled ? <ToggleRight size={21} weight="fill" /> : <ToggleLeft size={21} weight="fill" />}
            {item.enabled ? "Tắt" : "Bật"}
          </button>
        </div>
      </article>)}
    </div>}
  </section>;
}

import { useState } from "react";
import Pagination from "./Pagination";

const PAGE_SIZE = 10;

export default function UsersTab({ form, setForm, licenses, searchTerm, setSearchTerm, onSubmit, onToggle, onDelete, onReset, generateKey, formatDate }) {
  const [page, setPage] = useState(1);
  const term = searchTerm.trim().toLowerCase();
  const filtered = term ? licenses.filter((item) => [item.customer_name, item.customer_contact, item.key_code, item.note].some((value) => (value || "").toLowerCase().includes(term)) || (item.active_devices || []).some((device) => `${device.device_name || ""} ${device.device_hash || ""}`.toLowerCase().includes(term))) : licenses;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return <>
    <div className="panel"><div className="panel-header"><h3>➕ Thêm Người dùng & Cấp License Key Mới</h3></div><form onSubmit={onSubmit} className="form-grid two-col">
      <label className="form-group">Tên Người dùng / Khách hàng (*)<input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></label>
      <label className="form-group">Liên hệ<input value={form.customer_contact} onChange={(e) => setForm({ ...form, customer_contact: e.target.value })} /></label>
      <label className="form-group">Mã Key<div style={{ display: "flex", gap: 8 }}><input style={{ flex: 1 }} value={form.key_code} onChange={(e) => setForm({ ...form, key_code: e.target.value })} /><button type="button" className="btn-secondary" onClick={() => setForm({ ...form, key_code: generateKey() })}>Sinh Key</button></div></label>
      <label className="form-group">Giới hạn số máy<input type="number" min="1" value={form.max_devices} onChange={(e) => setForm({ ...form, max_devices: e.target.value })} /></label>
      <label className="form-group">Ngày hết hạn<input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></label>
      <label className="form-group">Ghi chú<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
      <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end" }}><button type="submit" className="btn-primary">🚀 Lưu & Cấp Key</button></div>
    </form></div>
    <div className="panel"><div className="panel-header"><h3>👥 Danh sách Người Dùng & Key</h3><input style={{ width: 300 }} placeholder="🔍 Tìm theo Tên, SĐT, Key, IP..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} /></div><div className="table-container"><table><thead><tr><th>ID</th><th>KHÁCH HÀNG</th><th>LIÊN HỆ</th><th>KEY</th><th>TRẠNG THÁI</th><th>IP</th><th>HẾT HẠN</th><th>THAO TÁC</th></tr></thead><tbody>{visibleItems.map((item) => <tr key={item.id}><td>#{item.id}</td><td><strong>{item.customer_name}</strong><div>{item.note}</div></td><td>{item.customer_contact}</td><td><span className="key-code-display">{item.key_code}</span></td><td><span className={`badge ${item.status}`}>{item.status}</span></td><td>{item.bound_ip_address || "Chưa gắn IP"}</td><td>{formatDate(item.expires_at)}</td><td><button className="btn-secondary" onClick={() => onToggle(item.id, item.status)}>{item.status === "active" ? "🔒 Vô hiệu" : "🔓 Mở lại"}</button>{item.bound_ip_address && <button className="btn-secondary" onClick={() => onReset(item.id, item.customer_name)}>🔄 Reset IP</button>}<button className="btn-danger" onClick={() => onDelete(item.id, item.customer_name)}>🗑️ Xóa</button></td></tr>)}</tbody></table></div><Pagination page={safePage} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={setPage} /></div>
  </>;
}

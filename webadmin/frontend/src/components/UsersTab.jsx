import { useState } from "react";
import Pagination from "./Pagination";
import {
  Plus, DiceFive, Rocket, Users, MagnifyingGlass, Lock, LockOpen,
  ArrowCounterClockwise, Trash, Key,
} from "@phosphor-icons/react";

const PAGE_SIZE = 10;

export default function UsersTab({
  form, setForm, licenses, searchTerm, setSearchTerm,
  onSubmit, onToggle, onDelete, onReset, generateKey, formatDate,
}) {
  const [page, setPage] = useState(1);
  const term = searchTerm.trim().toLowerCase();
  const filtered = term
    ? licenses.filter((item) => (
        [item.customer_name, item.customer_contact, item.key_code, item.note]
          .some((value) => (value || "").toLowerCase().includes(term))
        || (item.active_devices || []).some((device) => `${device.device_name || ""} ${device.device_hash || ""}`.toLowerCase().includes(term))
      ))
    : licenses;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return <>
    <div className="panel">
      <div className="panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="h3-icon"><Plus size={16} weight="duotone" /></div>
          <h3>Thêm Người dùng &amp; Cấp License Key Mới</h3>
        </div>
      </div>
      <form onSubmit={onSubmit} className="form-grid two-col">
        <label className="form-group">
          Tên Người dùng / Khách hàng (*)
          <input
            required
            value={form.customer_name}
            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
          />
        </label>
        <label className="form-group">
          Liên hệ
          <input
            value={form.customer_contact}
            onChange={(e) => setForm({ ...form, customer_contact: e.target.value })}
          />
        </label>
        <label className="form-group">
          Mã Key
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ flex: 1 }}
              className="mono-input"
              value={form.key_code}
              onChange={(e) => setForm({ ...form, key_code: e.target.value })}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setForm({ ...form, key_code: generateKey() })}
            >
              <DiceFive size={16} weight="duotone" />
              <span>Sinh Key</span>
            </button>
          </div>
        </label>
        <label className="form-group">
          Giới hạn số máy
          <input
            type="number"
            min="1"
            value={form.max_devices}
            onChange={(e) => setForm({ ...form, max_devices: e.target.value })}
          />
        </label>
        <label className="form-group">
          Ngày hết hạn
          <input
            type="datetime-local"
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
          />
        </label>
        <label className="form-group">
          Ghi chú
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </label>
        <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn-primary">
            <Rocket size={16} weight="duotone" />
            <span>Lưu &amp; Cấp Key</span>
          </button>
        </div>
      </form>
    </div>

    <div className="panel">
      <div className="panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="h3-icon"><Users size={16} weight="duotone" /></div>
          <h3>Danh sách Người Dùng &amp; Key</h3>
        </div>
        <div className="search-input-wrap">
          <MagnifyingGlass size={16} weight="duotone" />
          <input
            placeholder="Tìm theo Tên, SĐT, Key, IP…"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>KHÁCH HÀNG</th>
              <th>LIÊN HỆ</th>
              <th>KEY</th>
              <th>TRẠNG THÁI</th>
              <th>IP</th>
              <th>HẾT HẠN</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.id}>
                <td className="customer-id">#{item.id}</td>
                <td>
                  <div className="customer-name"><strong>{item.customer_name}</strong></div>
                  {item.note && <div className="customer-note">{item.note}</div>}
                </td>
                <td>{item.customer_contact}</td>
                <td>
                  <span className="key-code-display">
                    <Key size={13} weight="duotone" />
                    {item.key_code}
                  </span>
                </td>
                <td><span className={`badge ${item.status}`}>{item.status}</span></td>
                <td className={item.bound_ip_address ? "ip-tag bound" : "ip-tag unbound"}>
                  {item.bound_ip_address || "Chưa gắn IP"}
                </td>
                <td className="date-display">{formatDate(item.expires_at)}</td>
                <td className="actions-cell">
                  <button className="btn-secondary" onClick={() => onToggle(item.id, item.status)}>
                    {item.status === "active"
                      ? <><Lock size={14} weight="duotone" /><span>Vô hiệu</span></>
                      : <><LockOpen size={14} weight="duotone" /><span>Mở lại</span></>}
                  </button>
                  {item.bound_ip_address && (
                    <button className="btn-secondary" onClick={() => onReset(item.id, item.customer_name)}>
                      <ArrowCounterClockwise size={14} weight="duotone" />
                      <span>Reset IP</span>
                    </button>
                  )}
                  <button className="btn-danger" onClick={() => onDelete(item.id, item.customer_name)}>
                    <Trash size={14} weight="duotone" />
                    <span>Xóa</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={safePage}
        pageSize={PAGE_SIZE}
        totalItems={filtered.length}
        onPageChange={setPage}
      />
    </div>
  </>;
}

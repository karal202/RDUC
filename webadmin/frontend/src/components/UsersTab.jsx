import { useState } from "react";
import Pagination from "./Pagination";
import {
  Plus, DiceFive, Rocket, Users, MagnifyingGlass, Lock, LockOpen,
  ArrowCounterClockwise, Trash, Key, CopySimple, Check, Prohibit,
} from "@phosphor-icons/react";

const PAGE_SIZE = 10;

export default function UsersTab({
  form, setForm, licenses, searchTerm, setSearchTerm,
  onSubmit, onToggle, onDelete, onReset, onBlockHardware, generateKey, formatDate,
}) {
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  };

  const renderDate = (val) => {
    if (!val) return <span className="date-lifetime">Vĩnh viễn</span>;
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return val;
    const dateStr = d.toLocaleDateString("vi-VN");
    const timeStr = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    return (
      <div className="date-display-stacked" title={formatDate(val)}>
        <span className="date-main">{dateStr}</span>
        <span className="date-time">{timeStr}</span>
      </div>
    );
  };

  const renderIps = (ipStr) => {
    if (!ipStr) {
      return <span className="ip-chip unbound">Chưa gắn IP</span>;
    }
    const ips = ipStr.split(",").map((s) => s.trim()).filter(Boolean);
    return (
      <div className="ip-chip-list">
        {ips.map((ip, idx) => (
          <span key={idx} className="ip-chip bound" title={`IP đã gắn: ${ip}`}>
            <span className="ip-dot" />
            {ip}
          </span>
        ))}
      </div>
    );
  };

  const term = searchTerm.trim().toLowerCase();
  const filtered = term
    ? licenses.filter((item) => (
        [item.customer_name, item.customer_contact, item.key_code, item.note, item.bound_ip_address]
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
            placeholder="Tìm theo Tên, SĐT, Key, IPv4, HWID…"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="th-id">ID</th>
              <th className="th-customer">KHÁCH HÀNG</th>
              <th className="th-contact">LIÊN HỆ</th>
              <th className="th-key">KEY</th>
              <th className="th-status">TRẠNG THÁI</th>
              <th className="th-ip">IPv4</th>
              <th className="th-expires">HẾT HẠN</th>
              <th className="th-actions">THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.id}>
                <td className="customer-id">#{item.id}</td>
                <td>
                  <div className="customer-name" title={item.customer_name}>
                    <strong>{item.customer_name}</strong>
                  </div>
                  {item.note && <div className="customer-note" title={item.note}>{item.note}</div>}
                </td>
                <td className="customer-contact">{item.customer_contact || "—"}</td>
                <td>
                  <button
                    type="button"
                    className={`key-code-badge ${copiedId === item.id ? "copied" : ""}`}
                    onClick={() => copyToClipboard(item.key_code, item.id)}
                    title="Bấm để sao chép License Key"
                  >
                    <Key size={13} weight="duotone" className="key-icon" />
                    <span>{item.key_code}</span>
                    {copiedId === item.id ? (
                      <Check size={12} weight="bold" className="copy-state-icon done" />
                    ) : (
                      <CopySimple size={12} weight="duotone" className="copy-state-icon" />
                    )}
                  </button>
                </td>
                <td><span className={`badge ${item.status}`}>{item.status}</span></td>
                <td>
                  {renderIps(item.bound_ip_address)}
                  {(item.active_devices || []).map((device) => (
                    <div key={device.device_hash} className="device-inline-row" title={device.device_hash}>
                      <span>{device.device_name || "Thiết bị"}</span>
                      {!device.is_blocked && (
                        <button type="button" className="btn-device-block" onClick={() => onBlockHardware(device.device_hash, device.device_name)} title="Chặn phần cứng này">
                          <Prohibit size={13} weight="duotone" />
                        </button>
                      )}
                      {device.is_blocked && <span className="device-blocked-label">Đã chặn HW</span>}
                    </div>
                  ))}
                </td>
                <td>{renderDate(item.expires_at)}</td>
                <td className="actions-cell">
                  <div className="action-toolbar">
                    <button
                      type="button"
                      className={`btn-action ${item.status === "active" ? "btn-action-lock" : "btn-action-unlock"}`}
                      onClick={() => onToggle(item.id, item.status)}
                      title={item.status === "active" ? "Vô hiệu hóa Key này" : "Kích hoạt lại Key"}
                    >
                      {item.status === "active" ? (
                        <>
                          <Lock size={14} weight="duotone" />
                          <span>Vô hiệu</span>
                        </>
                      ) : (
                        <>
                          <LockOpen size={14} weight="duotone" />
                          <span>Mở lại</span>
                        </>
                      )}
                    </button>
                    {item.bound_ip_address && (
                      <button
                        type="button"
                        className="btn-action btn-action-reset"
                        onClick={() => onReset(item.id, item.customer_name)}
                        title="Reset IP đã gắn cho Key này"
                      >
                        <ArrowCounterClockwise size={14} weight="duotone" />
                        <span>Reset IP</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-action btn-action-delete"
                      onClick={() => onDelete(item.id, item.customer_name)}
                      title="Xóa vĩnh viễn Key"
                    >
                      <Trash size={14} weight="duotone" />
                      <span>Xóa</span>
                    </button>
                  </div>
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

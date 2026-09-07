import { useMemo, useState } from "react";
import Pagination from "./Pagination";
import {
  HardDrives,
  MagnifyingGlass,
  LockOpen,
  Prohibit,
  CopySimple,
  Check,
  Desktop,
  Key,
} from "@phosphor-icons/react";

const PAGE_SIZE = 10;

const formatDate = (value) => {
  if (!value) return "Chưa ghi nhận";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
};

export default function DevicesTab({ devices = [], onBlock, onUnblock }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [copiedHwid, setCopiedHwid] = useState(null);

  const copyHwid = (hwid) => {
    if (!hwid) return;
    navigator.clipboard.writeText(hwid).then(() => {
      setCopiedHwid(hwid);
      setTimeout(() => setCopiedHwid(null), 1800);
    });
  };

  const term = searchTerm.trim().toLowerCase();
  const filteredDevices = useMemo(() => {
    if (!term) return devices;
    return devices.filter((device) =>
      [
        device.device_name,
        device.device_hash,
        device.os_info,
        ...(device.licenses || []).map((license) => license.customer_name),
      ].some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [devices, term]);

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleDevices = filteredDevices.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const totalCount = devices.length;
  const blockedCount = devices.filter((d) => d.is_blocked).length;
  const activeCount = totalCount - blockedCount;

  return (
    <div className="panel device-list-panel">
      <div className="panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="h3-icon">
            <HardDrives size={18} weight="duotone" />
          </div>
          <div>
            <h3>Danh sách Thiết bị (Hardware / HWID)</h3>
            <p className="panel-subtitle">
              Quản lý định danh phần cứng máy tính và kiểm soát quyền chặn/mở chặn truy cập
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div className="device-summary-stats">
            <span className="device-stat-pill">
              Tổng: <strong>{totalCount}</strong>
            </span>
            <span className="device-stat-pill active">
              Cho phép: <strong>{activeCount}</strong>
            </span>
            {blockedCount > 0 && (
              <span className="device-stat-pill blocked">
                Đã chặn: <strong>{blockedCount}</strong>
              </span>
            )}
          </div>

          <div className="search-input-wrap">
            <MagnifyingGlass size={16} weight="duotone" />
            <input
              placeholder="Tìm tên máy, HWID, Key, OS…"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: "220px" }}>THIẾT BỊ</th>
              <th style={{ width: "200px" }}>HWID</th>
              <th>KEY &amp; KHÁCH HÀNG</th>
              <th>HOẠT ĐỘNG GẦN NHẤT</th>
              <th style={{ width: "130px" }}>TRẠNG THÁI</th>
              <th className="th-actions" style={{ width: "150px" }}>
                THAO TÁC
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleDevices.map((device) => (
              <tr key={device.id || device.device_hash}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Desktop size={18} weight="duotone" style={{ color: "var(--accent-primary-hover)", flexShrink: 0 }} />
                    <div>
                      <strong>{device.device_name || "Thiết bị chưa đặt tên"}</strong>
                      <div className="device-meta">{device.os_info || "Không rõ hệ điều hành"}</div>
                    </div>
                  </div>
                </td>

                <td>
                  <button
                    type="button"
                    className={`device-hwid-badge ${copiedHwid === device.device_hash ? "copied" : ""}`}
                    onClick={() => copyHwid(device.device_hash)}
                    title={`Click để chép HWID: ${device.device_hash}`}
                  >
                    <span className="hwid-text">{device.device_hash}</span>
                    {copiedHwid === device.device_hash ? (
                      <Check size={12} weight="bold" style={{ color: "#34d399", flexShrink: 0 }} />
                    ) : (
                      <CopySimple size={12} weight="duotone" style={{ opacity: 0.6, flexShrink: 0 }} />
                    )}
                  </button>
                </td>

                <td>
                  {(device.licenses || []).length ? (
                    device.licenses.map((license) => (
                      <div key={`${device.id}-${license.key_id}`} className="device-license-row">
                        <Key size={12} weight="duotone" style={{ color: "var(--accent-primary)" }} />
                        <span style={{ fontWeight: 500 }}>{license.customer_name}</span>
                        <span className={`badge ${license.is_active ? "active" : "disabled"}`}>
                          {license.is_active ? "Đang dùng" : "Ngắt"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="device-meta">Chưa gắn key nào</span>
                  )}
                </td>

                <td className="device-meta">{formatDate(device.last_seen)}</td>

                <td>
                  <span className={`badge ${device.is_blocked ? "revoked" : "active"}`}>
                    {device.is_blocked ? "Đã chặn" : "Cho phép"}
                  </span>
                  {device.blocked_reason && (
                    <div className="device-meta" title={device.blocked_reason}>
                      {device.blocked_reason}
                    </div>
                  )}
                </td>

                <td className="actions-cell">
                  <div className="action-toolbar" style={{ justifyContent: "flex-end" }}>
                    {device.is_blocked ? (
                      <button
                        type="button"
                        className="btn-action btn-action-unlock"
                        onClick={() => onUnblock(device.device_hash, device.device_name)}
                        title="Mở lại thiết bị này, cho phép kích hoạt key trở lại"
                      >
                        <LockOpen size={14} weight="duotone" />
                        <span>Mở lại</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-action btn-action-block"
                        onClick={() => onBlock(device.device_hash, device.device_name)}
                        title="Chặn thiết bị phần cứng này, cấm mọi hoạt động kích hoạt key"
                      >
                        <Prohibit size={14} weight="duotone" />
                        <span>Chặn máy</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!visibleDevices.length && (
              <tr>
                <td colSpan="6" className="empty-state" style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-tertiary)" }}>
                  Không tìm thấy thiết bị nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={safePage}
        pageSize={PAGE_SIZE}
        totalItems={filteredDevices.length}
        onPageChange={setPage}
      />
    </div>
  );
}
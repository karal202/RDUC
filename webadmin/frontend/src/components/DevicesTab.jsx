import { useMemo, useState } from "react";
import { HardDrives, MagnifyingGlass, LockOpen, Prohibit } from "@phosphor-icons/react";

const formatDate = (value) => {
  if (!value) return "Chưa ghi nhận";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
};

export default function DevicesTab({ devices, onBlock, onUnblock }) {
  const [searchTerm, setSearchTerm] = useState("");
  const term = searchTerm.trim().toLowerCase();
  const filteredDevices = useMemo(() => {
    if (!term) return devices;
    return devices.filter((device) => [
      device.device_name,
      device.device_hash,
      device.os_info,
      ...(device.licenses || []).map((license) => license.customer_name),
    ].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [devices, term]);

  return (
    <div className="panel device-list-panel">
      <div className="panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="h3-icon"><HardDrives size={16} weight="duotone" /></div>
          <div>
            <h3>Danh sách thiết bị</h3>
            <p className="panel-subtitle">Theo dõi HWID và kiểm soát quyền truy cập</p>
          </div>
        </div>
        <div className="search-input-wrap">
          <MagnifyingGlass size={16} weight="duotone" />
          <input
            placeholder="Tìm tên máy, HWID, key…"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>THIẾT BỊ</th>
              <th>HWID</th>
              <th>KEY ĐANG GẮN</th>
              <th>HOẠT ĐỘNG GẦN NHẤT</th>
              <th>TRẠNG THÁI</th>
              <th className="th-actions">THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {filteredDevices.map((device) => (
              <tr key={device.id}>
                <td>
                  <strong>{device.device_name || "Thiết bị chưa đặt tên"}</strong>
                  <div className="device-meta">{device.os_info || "Không rõ hệ điều hành"}</div>
                </td>
                <td><span className="device-hwid" title={device.device_hash}>{device.device_hash}</span></td>
                <td>
                  {(device.licenses || []).length ? device.licenses.map((license) => (
                    <div key={`${device.id}-${license.key_id}`} className="device-license-row">
                      <span>{license.customer_name}</span>
                      <span className={`badge ${license.is_active ? "active" : "disabled"}`}>{license.is_active ? "Đang dùng" : "Ngắt"}</span>
                    </div>
                  )) : <span className="device-meta">Chưa gắn key</span>}
                </td>
                <td className="device-meta">{formatDate(device.last_seen)}</td>
                <td>
                  <span className={`badge ${device.is_blocked ? "revoked" : "active"}`}>
                    {device.is_blocked ? "Đã chặn" : "Cho phép"}
                  </span>
                  {device.blocked_reason && <div className="device-meta">{device.blocked_reason}</div>}
                </td>
                <td className="actions-cell">
                  <div className="action-toolbar">
                    {device.is_blocked ? (
                      <button type="button" className="btn-action btn-action-unlock" onClick={() => onUnblock(device.device_hash, device.device_name)} title="Mở lại thiết bị">
                        <LockOpen size={14} weight="duotone" />
                        <span>Mở lại</span>
                      </button>
                    ) : (
                      <button type="button" className="btn-action btn-action-block" onClick={() => onBlock(device.device_hash, device.device_name)} title="Chặn thiết bị">
                        <Prohibit size={14} weight="duotone" />
                        <span>Chặn máy</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filteredDevices.length && <tr><td colSpan="6" className="empty-state">Chưa có thiết bị nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
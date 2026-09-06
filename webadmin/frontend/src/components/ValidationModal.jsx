import { KeyReturn, X } from "@phosphor-icons/react";

export default function ValidationModal({ form, setForm, onSubmit, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="h3-icon"><KeyReturn size={16} weight="duotone" /></div>
            <h3>Test API Validate Key</h3>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="form-grid">
          <label className="form-group">
            License Key
            <input
              className="mono-input"
              value={form.key_code}
              onChange={(e) => setForm({ ...form, key_code: e.target.value })}
            />
          </label>
          <label className="form-group">
            HWID Thiết bị
            <input
              className="mono-input"
              value={form.device_hash}
              onChange={(e) => setForm({ ...form, device_hash: e.target.value })}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary">Gửi kiểm tra</button>
          </div>
        </form>
      </div>
    </div>
  );
}

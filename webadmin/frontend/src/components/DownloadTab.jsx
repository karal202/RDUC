import { Globe, DownloadSimple, KeyReturn, Sparkle } from "@phosphor-icons/react";

export default function DownloadTab({ onOpenValidation }) {
  return (
    <div className="panel download-panel">
      <div className="panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="h3-icon"><Globe size={16} weight="duotone" /></div>
          <h3>Web Tải Ứng Dụng Tĩnh</h3>
        </div>
      </div>
      <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
        Người dùng tải file .exe, cài đặt và nhập Key kích hoạt do Admin cấp.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a
          className="btn-primary"
          href="/downloads/dawa-system-check-1.0.0.exe"
          download
          style={{ textDecoration: "none" }}
        >
          <DownloadSimple size={16} weight="duotone" />
          <span>Tải File .EXE</span>
          <Sparkle size={13} weight="fill" style={{ opacity: 0.8 }} />
        </a>
        <button className="btn-secondary" onClick={onOpenValidation}>
          <KeyReturn size={16} weight="duotone" />
          <span>Test Nhập Key qua API</span>
        </button>
      </div>
    </div>
  );
}

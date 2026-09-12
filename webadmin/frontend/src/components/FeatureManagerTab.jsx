import { useCallback, useEffect, useState } from "react";
import { Stack, Plus, Pencil, Trash, FolderOpen, X, CaretDown, CaretUp, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { API_BASE, fetchJson } from "../api/licenseApi";

const formatBytes = (size) => !size ? "—" : size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(2)} MB`;

export default function FeatureManagerTab({ onStatus }) {
  const [features, setFeatures] = useState([]);
  const [scannedFiles, setScannedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [expandedFeatures, setExpandedFeatures] = useState(new Set());
  const [showFeatureForm, setShowFeatureForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [parentFeatureKey, setParentFeatureKey] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  
  const [featureForm, setFeatureForm] = useState({ feature_key: "", feature_name: "", section: "", description: "" });
  const [profileForm, setProfileForm] = useState({ profile_key: "", profile_name: "", file_path: "", enabled: true, sort_order: 0 });
  
  const managerBase = API_BASE.replace("/license", "");

  const load = useCallback(async () => {
    setLoading(true);
    try { setFeatures((await fetchJson(`${managerBase}/feature-manager/features`)).data || []); }
    catch (error) { onStatus({ type: "error", text: error.message }); }
    finally { setLoading(false); }
  }, [managerBase, onStatus]);

  const scanFiles = useCallback(async () => {
    try { setScannedFiles((await fetchJson(`${managerBase}/feature-manager/scan`)).data || []); }
    catch (error) { onStatus({ type: "error", text: error.message }); }
  }, [managerBase, onStatus]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (showScanner) scanFiles(); }, [showScanner, scanFiles]);

  const toggleExpand = (featureKey) => {
    const newExpanded = new Set(expandedFeatures);
    if (newExpanded.has(featureKey)) {
      newExpanded.delete(featureKey);
    } else {
      newExpanded.add(featureKey);
    }
    setExpandedFeatures(newExpanded);
  };

  const handleAddFeature = () => {
    setEditingFeature(null);
    setFeatureForm({ feature_key: "", feature_name: "", section: "", description: "" });
    setShowFeatureForm(true);
  };

  const handleEditFeature = (feature) => {
    setEditingFeature(feature);
    setFeatureForm({ feature_key: feature.feature_key, feature_name: feature.feature_name, section: feature.section, description: feature.description });
    setShowFeatureForm(true);
  };

  const handleDeleteFeature = async (featureKey) => {
    if (!confirm(`Bạn có chắc muốn xóa feature "${featureKey}"? Tất cả profiles sẽ bị xóa theo.`)) return;
    try {
      await fetchJson(`${managerBase}/feature-manager/features/${encodeURIComponent(featureKey)}`, { method: "DELETE" });
      setFeatures((current) => current.filter((f) => f.feature_key !== featureKey));
      onStatus({ type: "success", text: `Đã xóa ${featureKey}.` });
    } catch (error) { onStatus({ type: "error", text: error.message }); }
  };

  const handleAddProfile = (featureKey) => {
    setEditingProfile(null);
    setParentFeatureKey(featureKey);
    setProfileForm({ profile_key: "", profile_name: "", file_path: "", enabled: true, sort_order: 0 });
    setShowProfileForm(true);
  };

  const handleEditProfile = (featureKey, profile) => {
    setEditingProfile(profile);
    setParentFeatureKey(featureKey);
    setProfileForm({ profile_key: profile.profile_key, profile_name: profile.profile_name, file_path: profile.file_path, enabled: profile.enabled, sort_order: profile.sort_order });
    setShowProfileForm(true);
  };

  const handleDeleteProfile = async (featureKey, profileKey) => {
    if (!confirm(`Bạn có chắc muốn xóa profile "${profileKey}"?`)) return;
    try {
      await fetchJson(`${managerBase}/feature-manager/features/${encodeURIComponent(featureKey)}/profiles/${encodeURIComponent(profileKey)}`, { method: "DELETE" });
      setFeatures((current) => current.map((f) => {
        if (f.feature_key === featureKey) {
          return { ...f, profiles: f.profiles.filter((p) => p.profile_key !== profileKey) };
        }
        return f;
      }));
      onStatus({ type: "success", text: `Đã xóa ${profileKey}.` });
    } catch (error) { onStatus({ type: "error", text: error.message }); }
  };

  const handleToggleProfile = async (featureKey, profile) => {
    try {
      const result = await fetchJson(`${managerBase}/feature-manager/features/${encodeURIComponent(featureKey)}/profiles/${encodeURIComponent(profile.profile_key)}`, { method: "PATCH", body: JSON.stringify({ enabled: !profile.enabled }) });
      setFeatures((current) => current.map((f) => {
        if (f.feature_key === featureKey) {
          return { ...f, profiles: f.profiles.map((p) => p.profile_key === profile.profile_key ? result.data : p) };
        }
        return f;
      }));
      onStatus({ type: "success", text: `${profile.profile_name} đã ${profile.enabled ? "tắt" : "bật"}.` });
    } catch (error) { onStatus({ type: "error", text: error.message }); }
  };

  const handleFeatureSubmit = async (e) => {
    e.preventDefault();
    setSaving("feature");
    try {
      if (editingFeature) {
        const result = await fetchJson(`${managerBase}/feature-manager/features/${encodeURIComponent(editingFeature.feature_key)}`, { method: "PATCH", body: JSON.stringify(featureForm) });
        setFeatures((current) => current.map((f) => f.feature_key === editingFeature.feature_key ? result.data : f));
        onStatus({ type: "success", text: `Đã cập nhật ${editingFeature.feature_key}.` });
      } else {
        const result = await fetchJson(`${managerBase}/feature-manager/features`, { method: "POST", body: JSON.stringify(featureForm) });
        setFeatures((current) => [...current, { ...result.data, profiles: [] }]);
        onStatus({ type: "success", text: `Đã thêm ${featureForm.feature_key}.` });
      }
      setShowFeatureForm(false);
    } catch (error) { onStatus({ type: "error", text: error.message }); }
    finally { setSaving(""); }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving("profile");
    try {
      if (editingProfile) {
        const result = await fetchJson(`${managerBase}/feature-manager/features/${encodeURIComponent(parentFeatureKey)}/profiles/${encodeURIComponent(editingProfile.profile_key)}`, { method: "PATCH", body: JSON.stringify(profileForm) });
        setFeatures((current) => current.map((f) => {
          if (f.feature_key === parentFeatureKey) {
            return { ...f, profiles: f.profiles.map((p) => p.profile_key === editingProfile.profile_key ? result.data : p) };
          }
          return f;
        }));
        onStatus({ type: "success", text: `Đã cập nhật ${editingProfile.profile_name}.` });
      } else {
        const result = await fetchJson(`${managerBase}/feature-manager/features/${encodeURIComponent(parentFeatureKey)}/profiles`, { method: "POST", body: JSON.stringify(profileForm) });
        setFeatures((current) => current.map((f) => {
          if (f.feature_key === parentFeatureKey) {
            return { ...f, profiles: [...f.profiles, result.data].sort((a, b) => a.sort_order - b.sort_order) };
          }
          return f;
        }));
        onStatus({ type: "success", text: `Đã thêm ${profileForm.profile_name}.` });
      }
      setShowProfileForm(false);
    } catch (error) { onStatus({ type: "error", text: error.message }); }
    finally { setSaving(""); }
  };

  const selectFile = (filePath) => {
    setProfileForm({ ...profileForm, file_path: filePath });
    setShowScanner(false);
  };

  return <section className="panel feature-manager-panel">
    <div className="panel-header">
      <div>
        <h3>Quản lý Tính năng &amp; Profiles</h3>
        <p>CRUD: Thêm, sửa, xóa tính năng và các file kích hoạt tương ứng.</p>
      </div>
      <div className="panel-actions">
        <button className="btn-primary" onClick={handleAddFeature}><Plus size={18} weight="fill" />Thêm Feature</button>
      </div>
    </div>

    {showFeatureForm && <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h4>{editingFeature ? "Sửa Feature" : "Thêm Feature Mới"}</h4>
          <button className="btn-icon" onClick={() => setShowFeatureForm(false)}><X size={20} /></button>
        </div>
        <form onSubmit={handleFeatureSubmit}>
          <div className="form-group">
            <label>Feature Key *</label>
            <input type="text" value={featureForm.feature_key} onChange={(e) => setFeatureForm({ ...featureForm, feature_key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} disabled={!!editingFeature} placeholder="ram-optimization" required />
          </div>
          <div className="form-group">
            <label>Feature Name *</label>
            <input type="text" value={featureForm.feature_name} onChange={(e) => setFeatureForm({ ...featureForm, feature_name: e.target.value })} placeholder="RAM Profile Optimization" required />
          </div>
          <div className="form-group">
            <label>Section *</label>
            <input type="text" value={featureForm.section} onChange={(e) => setFeatureForm({ ...featureForm, section: e.target.value })} placeholder="Optimize" required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={featureForm.description} onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })} placeholder="Mô tả tính năng..." rows={3} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowFeatureForm(false)}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={saving === "feature"}>{saving === "feature" ? "Đang lưu..." : (editingFeature ? "Cập nhật" : "Thêm")}</button>
          </div>
        </form>
      </div>
    </div>}

    {showProfileForm && <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h4>{editingProfile ? "Sửa Profile" : "Thêm Profile Mới"}</h4>
          <button className="btn-icon" onClick={() => setShowProfileForm(false)}><X size={20} /></button>
        </div>
        <form onSubmit={handleProfileSubmit}>
          <div className="form-group">
            <label>Profile Key *</label>
            <input type="text" value={profileForm.profile_key} onChange={(e) => setProfileForm({ ...profileForm, profile_key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} disabled={!!editingProfile} placeholder="8gb" required />
          </div>
          <div className="form-group">
            <label>Profile Name *</label>
            <input type="text" value={profileForm.profile_name} onChange={(e) => setProfileForm({ ...profileForm, profile_name: e.target.value })} placeholder="8GB RAM" required />
          </div>
          <div className="form-group">
            <label>File Path *</label>
            <div className="input-group">
              <input type="text" value={profileForm.file_path} onChange={(e) => setProfileForm({ ...profileForm, file_path: e.target.value })} placeholder="Optimizer/Ram Optimization/8GB Ram.reg" required />
              <button type="button" className="btn-secondary" onClick={() => setShowScanner(true)}><FolderOpen size={18} /></button>
            </div>
          </div>
          <div className="form-group">
            <label>Sort Order</label>
            <input type="number" value={profileForm.sort_order} onChange={(e) => setProfileForm({ ...profileForm, sort_order: parseInt(e.target.value) || 0 })} min={0} />
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={profileForm.enabled} onChange={(e) => setProfileForm({ ...profileForm, enabled: e.target.checked })} />
              Enabled
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowProfileForm(false)}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={saving === "profile"}>{saving === "profile" ? "Đang lưu..." : (editingProfile ? "Cập nhật" : "Thêm")}</button>
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
                <Stack size={16} />
                <span>{file.path}</span>
                <small>{formatBytes(file.size)}</small>
              </div>
            ))}
          </div>}
        </div>
      </div>
    </div>}

    {loading ? <div className="empty-state">Đang tải danh sách tính năng…</div> : 
    <div className="feature-list">
      {features.map((feature) => (
        <div key={feature.feature_key} className="feature-card">
          <div className="feature-header" onClick={() => toggleExpand(feature.feature_key)}>
            <div className="feature-info">
              <span className="feature-section">{feature.section}</span>
              <strong>{feature.feature_name}</strong>
              <small>{feature.description}</small>
            </div>
            <div className="feature-actions">
              <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleEditFeature(feature); }} title="Sửa"><Pencil size={18} /></button>
              <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleDeleteFeature(feature.feature_key); }} title="Xóa"><Trash size={18} /></button>
              <button className="btn-icon" title={expandedFeatures.has(feature.feature_key) ? "Thu gọn" : "Mở rộng"}>
                {expandedFeatures.has(feature.feature_key) ? <CaretUp size={20} /> : <CaretDown size={20} />}
              </button>
            </div>
          </div>
          {expandedFeatures.has(feature.feature_key) && (
            <div className="feature-profiles">
              <div className="profiles-header">
                <span>Profiles ({feature.profiles.length})</span>
                <button className="btn-primary btn-sm" onClick={() => handleAddProfile(feature.feature_key)}><Plus size={16} />Thêm Profile</button>
              </div>
              {feature.profiles.length === 0 ? <div className="empty-state">Chưa có profile nào</div> :
              <div className="profiles-list">
                {feature.profiles.map((profile) => (
                  <div key={profile.id} className="profile-row">
                    <div className="profile-info">
                      <span className={`profile-status ${profile.enabled ? "enabled" : "disabled"}`}>
                        {profile.enabled ? <CheckCircle size={14} weight="fill" /> : <WarningCircle size={14} weight="fill" />}
                      </span>
                      <strong>{profile.profile_name}</strong>
                      <code>{profile.profile_key}</code>
                      <small>{profile.file_path}</small>
                      {!profile.exists && <span className="warning-text">⚠️ File không tồn tại</span>}
                    </div>
                    <div className="profile-actions">
                      <button className="btn-icon" onClick={() => handleEditProfile(feature.feature_key, profile)} title="Sửa"><Pencil size={16} /></button>
                      <button className="btn-icon" onClick={() => handleDeleteProfile(feature.feature_key, profile.profile_key)} title="Xóa"><Trash size={16} /></button>
                      <button className="btn-secondary btn-sm" onClick={() => handleToggleProfile(feature.feature_key, profile)}>
                        {profile.enabled ? "Tắt" : "Bật"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>}
            </div>
          )}
        </div>
      ))}
    </div>}
  </section>;
}

import express from "express";
import fs from "fs";
import path from "path";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { desktopLicenseMiddleware } from "../common/middleware/desktopLicense.middleware.js";
import FeatureFilePolicy from "../models/featureFilePolicy.model.js";

const router = express.Router();

// These are deliberately an allowlist. Admin can enable/disable a feature, but can
// never turn an uploaded or arbitrary file into something the desktop executes.
const FEATURE_FILES = [
  ["bios-bat", "BIOS", "BIOS/bios.bat"],
  ["ntfs-bat", "BIOS / NTFS", "BIOS/NTFS.bat"],
  ["network-tcp-ping", "Network", "Network/AckTicksandAckFrequency.reg"],
  ["network-flush-dns", "Network", "Network/DNS.cmd"],
  ["mouse-disable-acceleration", "Input Lag", "Input Lag/Reduce Input Lag/System.reg"],
  ["msi-utility", "Tools & Cache", "Tool&cache/MSI Utility/MSI Utility V3.exe"],
  ["ram-optimization", "Tools & Cache", "Optimizer/Ram Optimization/Reset to Default.reg"],
  ["windows-settings-tweaks", "Tools & Cache", "Tool&cache/Classic Right Click Menu/Windows 11.reg"],
  ["dawa-cleaner", "Tools & Cache", "Tool&cache/Clean/Clear.bat"],
  ["dawa-power-plan", "Optimize", "Optimizer/4. PowerPlan/Dawa_Utilmate.pow"],
];

const resolveScriptsDir = () => path.resolve(process.cwd(), "../../appdesktop/resources/scripts");

async function readPolicy() {
  const rows = await FeatureFilePolicy.findAll({ attributes: ["feature_key", "enabled"] });
  return Object.fromEntries(rows.map((row) => [row.feature_key, row.enabled]));
}

async function buildFeatures() {
  const policy = await readPolicy();
  const scriptsDir = resolveScriptsDir();
  return FEATURE_FILES.map(([key, section, relativePath]) => {
    const fullPath = path.resolve(scriptsDir, relativePath);
    const exists = fullPath.startsWith(scriptsDir) && fs.existsSync(fullPath);
    const stat = exists ? fs.statSync(fullPath) : null;
    return {
      key,
      section,
      file: relativePath,
      exists,
      linked: true,
      size: stat?.size || 0,
      enabled: policy[key] !== false,
    };
  });
}

router.get("/features", authMiddleware, (req, res) => {
  buildFeatures().then((data) => res.json({ success: true, data })).catch((error) => {
    res.status(500).json({ success: false, message: error.message });
  });
});

router.patch("/features/:key", authMiddleware, async (req, res) => {
  const feature = FEATURE_FILES.find(([key]) => key === req.params.key);
  if (!feature || typeof req.body?.enabled !== "boolean") {
    return res.status(400).json({ success: false, message: "Chức năng hoặc trạng thái không hợp lệ." });
  }
  await FeatureFilePolicy.upsert({
    feature_key: feature[0],
    enabled: req.body.enabled,
    updated_by: req.user.id,
    updated_at: new Date(),
  });
  const data = await buildFeatures();
  res.json({ success: true, data: data.find((item) => item.key === feature[0]) });
});

// Desktop receives only a compact policy after its license has been verified.
router.get("/desktop-policy", desktopLicenseMiddleware, async (req, res) => {
  // The web backend may run separately from the packaged desktop app, so a
  // missing local source file must not accidentally disable users' features.
  const enabled = Object.fromEntries((await buildFeatures()).map((item) => [item.key, item.enabled]));
  res.json({ success: true, enabled });
});

export default router;

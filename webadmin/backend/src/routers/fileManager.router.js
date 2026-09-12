import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { desktopLicenseMiddleware } from "../common/middleware/desktopLicense.middleware.js";
import FeatureFilePolicy from "../models/featureFilePolicy.model.js";
import ScriptLibraryFile from "../models/scriptLibraryFile.model.js";

const router = express.Router();

const resolveScriptsDir = () => path.resolve(process.cwd(), "../../appdesktop/resources/scripts");
const resolveLibraryDir = () => path.join(resolveScriptsDir(), "Unassigned");
const ALLOWED_SCRIPT_EXTENSIONS = new Set([".reg", ".bat", ".cmd", ".ps1", ".pow"]);
const uploadStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    const directory = resolveLibraryDir();
    fs.mkdirSync(directory, { recursive: true });
    callback(null, directory);
  },
  filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});
const uploadScriptFile = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, ALLOWED_SCRIPT_EXTENSIONS.has(path.extname(file.originalname).toLowerCase())),
});

function validateFeatureKey(key) {
  if (typeof key !== "string" || !/^[a-z0-9-]+$/.test(key)) {
    throw new Error("Feature key must use lowercase letters, numbers, and hyphens only.");
  }
}

function validateFilePath(filePath) {
  const scriptsDir = resolveScriptsDir();
  const fullPath = path.resolve(scriptsDir, String(filePath || ""));
  const scriptsPrefix = scriptsDir.endsWith(path.sep) ? scriptsDir : `${scriptsDir}${path.sep}`;
  if (!filePath || !fullPath.startsWith(scriptsPrefix) || !fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    throw new Error("File must exist inside resources/scripts.");
  }
}

// Scan directory recursively to find all files
async function scanDirectory(dir, baseDir = dir) {
  const files = [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      files.push(...await scanDirectory(fullPath, baseDir));
    } else if (entry.isFile()) {
      const stat = await fs.promises.stat(fullPath);
      files.push({
        path: relativePath,
        fullPath,
        size: stat.size,
        modified: stat.mtime
      });
    }
  }
  
  return files;
}

// Build features list from database
async function buildFeatures({ includeDeleted = false } = {}) {
  const policyRows = await FeatureFilePolicy.findAll({ 
    where: includeDeleted ? undefined : { deleted_at: null },
    attributes: ["feature_key", "enabled", "section", "file_path"],
    order: [['section', 'ASC'], ['feature_key', 'ASC']]
  });
  const scriptsDir = resolveScriptsDir();
  
  const features = policyRows.map((row) => {
    const fullPath = path.resolve(scriptsDir, row.file_path);
    const exists = fullPath.startsWith(scriptsDir) && fs.existsSync(fullPath);
    const stat = exists ? fs.statSync(fullPath) : null;
    return {
      key: row.feature_key,
      section: row.section,
      file: row.file_path,
      exists,
      linked: true,
      size: stat?.size || 0,
      enabled: row.enabled !== false,
      deleted: Boolean(row.deleted_at),
    };
  });
  
  return features;
}

// GET /features - List all feature files from database
router.get("/features", authMiddleware, async (req, res) => {
  try {
    const data = await buildFeatures();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /features - Create new feature file entry
router.post("/features", authMiddleware, async (req, res) => {
  const { key, section, file_path, enabled = true } = req.body;
  
  if (!key || !section || !file_path) {
    return res.status(400).json({ success: false, message: "Key, section và file_path là bắt buộc." });
  }
  
  // Check if key already exists
  const existing = await FeatureFilePolicy.findOne({ where: { feature_key: key } });
  if (existing?.deleted_at) {
    validateFeatureKey(key);
    validateFilePath(file_path);
    await existing.update({
      section,
      file_path,
      enabled: Boolean(enabled),
      deleted_at: null,
      updated_by: req.user.id,
      updated_at: new Date(),
    });
    const data = await buildFeatures();
    return res.json({ success: true, data: data.find((item) => item.key === key) });
  }
  if (existing) {
    return res.status(400).json({ success: false, message: "Key này đã tồn tại." });
  }
  
  try {
    validateFeatureKey(key);
    validateFilePath(file_path);
    await FeatureFilePolicy.create({
      feature_key: key,
      section,
      file_path,
      enabled,
      created_by: req.user.id,
      updated_by: req.user.id,
    });
    
    const data = await buildFeatures();
    res.json({ success: true, data: data.find((item) => item.key === key) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /features/:key - Update feature file entry
router.patch("/features/:key", authMiddleware, async (req, res) => {
  const { key } = req.params;
  const { section, file_path, enabled } = req.body;
  
  const existing = await FeatureFilePolicy.findOne({ where: { feature_key: key } });
  if (!existing) {
    return res.status(404).json({ success: false, message: "Không tìm thấy feature." });
  }
  
  try {
    if (file_path !== undefined) validateFilePath(file_path);
    const updateData = { updated_by: req.user.id, updated_at: new Date() };
    if (section !== undefined) updateData.section = section;
    if (file_path !== undefined) updateData.file_path = file_path;
    if (enabled !== undefined) updateData.enabled = Boolean(enabled);
    
    await FeatureFilePolicy.update(updateData, { where: { feature_key: key } });
    
    const data = await buildFeatures();
    res.json({ success: true, data: data.find((item) => item.key === key) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /features/:key - Delete feature file entry
router.delete("/features/:key", authMiddleware, async (req, res) => {
  const { key } = req.params;
  
  const existing = await FeatureFilePolicy.findOne({ where: { feature_key: key } });
  if (!existing) {
    return res.status(404).json({ success: false, message: "Không tìm thấy feature." });
  }
  
  try {
    await FeatureFilePolicy.update(
      { enabled: false, deleted_at: new Date(), updated_by: req.user.id, updated_at: new Date() },
      { where: { feature_key: key } }
    );
    res.json({ success: true, message: "Đã xóa feature." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /scan - Scan scripts directory to show available files
router.get("/scan", authMiddleware, async (req, res) => {
  try {
    const scriptsDir = resolveScriptsDir();
    const files = await scanDirectory(scriptsDir);
    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /upload - Store an unassigned file. It is never served to desktop clients.
router.post("/upload", authMiddleware, uploadScriptFile.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Chỉ chấp nhận file .reg, .bat, .cmd, .ps1 hoặc .pow (tối đa 5 MB)." });
  }
  const relativePath = path.posix.join("Unassigned", req.file.filename);
  try {
    const sha256 = crypto.createHash("sha256").update(await fs.promises.readFile(req.file.path)).digest("hex");
    const entry = await ScriptLibraryFile.create({
      original_name: path.basename(req.file.originalname),
      storage_name: req.file.filename,
      relative_path: relativePath,
      mime_type: req.file.mimetype,
      size: req.file.size,
      sha256,
      created_by: req.user.id,
    });
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/library", authMiddleware, async (_req, res) => {
  const data = await ScriptLibraryFile.findAll({ order: [["created_at", "DESC"]] });
  res.json({ success: true, data });
});

router.delete("/library/:id", authMiddleware, async (req, res) => {
  const entry = await ScriptLibraryFile.findByPk(req.params.id);
  if (!entry) return res.status(404).json({ success: false, message: "Không tìm thấy file trong kho chờ gán." });
  const libraryDir = resolveLibraryDir();
  const filePath = path.resolve(libraryDir, entry.storage_name);
  if (!filePath.startsWith(`${libraryDir}${path.sep}`)) {
    return res.status(400).json({ success: false, message: "Đường dẫn file không hợp lệ." });
  }
  await fs.promises.unlink(filePath).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  await entry.destroy();
  res.json({ success: true });
});

// Legacy route kept below for source compatibility; the secure route above handles requests.
// POST /upload - Upload file to scripts directory
router.post("/upload", authMiddleware, (req, res) => {
  // Note: This would need multer or similar middleware for file uploads
  // For now, return error until properly implemented
  res.status(501).json({ success: false, message: "Upload chưa được implement. Sử dụng file manager trực tiếp." });
});

// Desktop receives only a compact policy after its license has been verified.
router.get("/desktop-policy", desktopLicenseMiddleware, async (req, res) => {
  const features = Object.fromEntries((await buildFeatures({ includeDeleted: true })).map((item) => [item.key, {
    enabled: item.enabled && item.exists && !item.deleted,
    exists: item.exists,
    deleted: item.deleted,
  }]));
  // Keep the existing compact shape for older desktop versions.
  const enabled = Object.fromEntries(Object.entries(features).map(([key, item]) => [key, item.enabled]));
  res.json({ success: true, enabled, features });
});

export default router;

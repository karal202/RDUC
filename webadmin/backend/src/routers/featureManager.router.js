import express from "express";
import fs from "fs";
import path from "path";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { desktopLicenseMiddleware } from "../common/middleware/desktopLicense.middleware.js";
import Feature from "../models/feature.model.js";
import FeatureProfile from "../models/featureProfile.model.js";
import FeatureAuditLog from "../models/featureAuditLog.model.js";

const router = express.Router();

const resolveScriptsDir = () => path.resolve(process.cwd(), "../../appdesktop/resources/scripts");

// Security: Validate file path is within scripts directory
function validateFilePath(filePath) {
  const scriptsDir = resolveScriptsDir();
  const fullPath = path.resolve(scriptsDir, filePath);
  
  // Check if path tries to escape scripts directory
  if (!fullPath.startsWith(scriptsDir)) {
    throw new Error("File path must be within resources/scripts directory");
  }
  
  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    throw new Error("File does not exist in scripts directory");
  }
  
  return fullPath;
}

// Security: Validate key format (kebab-case)
function validateKey(key) {
  if (!/^[a-z0-9-]+$/.test(key)) {
    throw new Error("Key must be kebab-case (lowercase, numbers, hyphens only)");
  }
  return key;
}

// Audit logging helper
async function logAudit(action, entityType, entityKey, oldValue, newValue, userId, ipAddress) {
  await FeatureAuditLog.create({
    action,
    entity_type: entityType,
    entity_key: entityKey,
    old_value: oldValue,
    new_value: newValue,
    changed_by: userId,
    ip_address: ipAddress,
  });
}

// Scan directory to find available files
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
        size: stat.size,
        modified: stat.mtime
      });
    }
  }
  
  return files;
}

// GET /features - List all features with their profiles
router.get("/features", authMiddleware, async (req, res) => {
  try {
    const features = await Feature.findAll({
      order: [['section', 'ASC'], ['feature_name', 'ASC']]
    });
    
    const featuresWithProfiles = await Promise.all(
      features.map(async (feature) => {
        const profiles = await FeatureProfile.findAll({
          where: { feature_key: feature.feature_key },
          order: [['sort_order', 'ASC'], ['profile_name', 'ASC']]
        });
        
        const profilesWithSize = profiles.map((profile) => {
          try {
            const fullPath = path.resolve(resolveScriptsDir(), profile.file_path);
            const exists = fs.existsSync(fullPath);
            const stat = exists ? fs.statSync(fullPath) : null;
            return {
              ...profile.toJSON(),
              exists,
              size: stat?.size || 0
            };
          } catch {
            return { ...profile.toJSON(), exists: false, size: 0 };
          }
        });
        
        return {
          ...feature.toJSON(),
          profiles: profilesWithSize
        };
      })
    );
    
    res.json({ success: true, data: featuresWithProfiles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /features - Create new feature
router.post("/features", authMiddleware, async (req, res) => {
  const { feature_key, feature_name, section, description } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  
  try {
    validateKey(feature_key);
    
    const existing = await Feature.findOne({ where: { feature_key } });
    if (existing) {
      return res.status(400).json({ success: false, message: "Feature key already exists" });
    }
    
    const feature = await Feature.create({
      feature_key,
      feature_name,
      section,
      description,
      created_by: req.user.id,
      updated_by: req.user.id,
    });
    
    await logAudit('CREATE', 'FEATURE', feature_key, null, feature.toJSON(), req.user.id, ipAddress);
    
    res.json({ success: true, data: feature });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /features/:key - Update feature
router.patch("/features/:key", authMiddleware, async (req, res) => {
  const { key } = req.params;
  const { feature_name, section, description } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  
  try {
    const existing = await Feature.findOne({ where: { feature_key: key } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Feature not found" });
    }
    
    const oldValue = existing.toJSON();
    const updateData = { updated_by: req.user.id };
    if (feature_name !== undefined) updateData.feature_name = feature_name;
    if (section !== undefined) updateData.section = section;
    if (description !== undefined) updateData.description = description;
    
    await Feature.update(updateData, { where: { feature_key: key } });
    const updated = await Feature.findOne({ where: { feature_key: key } });
    
    await logAudit('UPDATE', 'FEATURE', key, oldValue, updated.toJSON(), req.user.id, ipAddress);
    
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /features/:key - Delete feature (cascades to profiles)
router.delete("/features/:key", authMiddleware, async (req, res) => {
  const { key } = req.params;
  const ipAddress = req.ip || req.connection.remoteAddress;
  
  try {
    const existing = await Feature.findOne({ where: { feature_key: key } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Feature not found" });
    }
    
    await logAudit('DELETE', 'FEATURE', key, existing.toJSON(), null, req.user.id, ipAddress);
    await Feature.destroy({ where: { feature_key: key } });
    
    res.json({ success: true, message: "Feature deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /features/:key/profiles - Add profile to feature
router.post("/features/:key/profiles", authMiddleware, async (req, res) => {
  const { key } = req.params;
  const { profile_key, profile_name, file_path, enabled = true, sort_order = 0 } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  
  try {
    validateKey(profile_key);
    validateFilePath(file_path);
    
    const feature = await Feature.findOne({ where: { feature_key: key } });
    if (!feature) {
      return res.status(404).json({ success: false, message: "Feature not found" });
    }
    
    const existing = await FeatureProfile.findOne({ 
      where: { feature_key: key, profile_key } 
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "Profile key already exists for this feature" });
    }
    
    const profile = await FeatureProfile.create({
      feature_key: key,
      profile_key,
      profile_name,
      file_path,
      enabled,
      sort_order,
      created_by: req.user.id,
      updated_by: req.user.id,
    });
    
    await logAudit('CREATE', 'PROFILE', `${key}:${profile_key}`, null, profile.toJSON(), req.user.id, ipAddress);
    
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /features/:key/profiles/:profileKey - Update profile
router.patch("/features/:key/profiles/:profileKey", authMiddleware, async (req, res) => {
  const { key, profileKey } = req.params;
  const { profile_name, file_path, enabled, sort_order } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  
  try {
    if (file_path) validateFilePath(file_path);
    
    const existing = await FeatureProfile.findOne({ 
      where: { feature_key: key, profile_key: profileKey } 
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    
    const oldValue = existing.toJSON();
    const updateData = { updated_by: req.user.id };
    if (profile_name !== undefined) updateData.profile_name = profile_name;
    if (file_path !== undefined) updateData.file_path = file_path;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    
    await FeatureProfile.update(updateData, { 
      where: { feature_key: key, profile_key: profileKey } 
    });
    const updated = await FeatureProfile.findOne({ 
      where: { feature_key: key, profile_key: profileKey } 
    });
    
    await logAudit('UPDATE', 'PROFILE', `${key}:${profileKey}`, oldValue, updated.toJSON(), req.user.id, ipAddress);
    
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /features/:key/profiles/:profileKey - Delete profile
router.delete("/features/:key/profiles/:profileKey", authMiddleware, async (req, res) => {
  const { key, profileKey } = req.params;
  const ipAddress = req.ip || req.connection.remoteAddress;
  
  try {
    const existing = await FeatureProfile.findOne({ 
      where: { feature_key: key, profile_key: profileKey } 
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    
    await logAudit('DELETE', 'PROFILE', `${key}:${profileKey}`, existing.toJSON(), null, req.user.id, ipAddress);
    await FeatureProfile.destroy({ 
      where: { feature_key: key, profile_key: profileKey } 
    });
    
    res.json({ success: true, message: "Profile deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /scan - Scan scripts directory
router.get("/scan", authMiddleware, async (req, res) => {
  try {
    const scriptsDir = resolveScriptsDir();
    const files = await scanDirectory(scriptsDir);
    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Desktop receives compact policy for enabled features
router.get("/desktop-policy", desktopLicenseMiddleware, async (req, res) => {
  try {
    const enabledFeatures = await Feature.findAll({
      where: {}, // All features are accessible
      include: [{
        model: FeatureProfile,
        where: { enabled: true },
        required: false
      }]
    });
    
    const policy = {};
    enabledFeatures.forEach((feature) => {
      policy[feature.feature_key] = {
        name: feature.feature_name,
        section: feature.section,
        profiles: feature.feature_profiles.map((p) => ({
          key: p.profile_key,
          name: p.profile_name,
          file: p.file_path
        }))
      };
    });
    
    res.json({ success: true, policy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

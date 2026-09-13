import express from "express";
import rateLimit from "express-rate-limit";
import {
  createLicense,
  getDashboard,
  getDatabaseHealth,
  getLicenses,
  getDevices,
  getLogs,
  updateLicense,
  deleteLicense,
  validateLicense,
  refreshDesktopToken,
  checkDesktopLicense,
  blockHardware,
  unblockHardware,
} from "../controllers/license.controller.js";
import { desktopLicenseMiddleware } from "../common/middleware/desktopLicense.middleware.js";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { requireAdmin, requireSuperAdmin } from "../common/middleware/role.middleware.js";
import {
  validateLicenseCreateInput,
  validateLicenseUpdateInput,
  validateIdParam,
  validateClientLicenseInput,
  validateHardwareBlockInput,
} from "../common/middleware/validation.middleware.js";

const router = express.Router();

const validateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  message: {
    success: false,
    valid: false,
    message: "Quá nhiều yêu cầu xác thực key. Vui lòng thử lại sau 1 phút.",
  },
});

// Public health check
router.get("/health", getDatabaseHealth);

// Admin routes - Quản lý License, Devices, Logs
router.get("/dashboard", authMiddleware, requireAdmin, getDashboard);
router.get("/licenses", authMiddleware, requireAdmin, getLicenses);
router.post("/licenses", authMiddleware, requireAdmin, validateLicenseCreateInput, createLicense);
router.put("/licenses/:id", authMiddleware, requireAdmin, validateLicenseUpdateInput, updateLicense);
router.delete("/licenses/:id", authMiddleware, requireSuperAdmin, validateIdParam, deleteLicense);

router.get("/devices", authMiddleware, requireAdmin, getDevices);
router.get("/logs", authMiddleware, requireAdmin, getLogs);

router.post("/hardware-blocks", authMiddleware, requireAdmin, validateHardwareBlockInput, blockHardware);
router.delete("/hardware-blocks/:hardwareId", authMiddleware, requireAdmin, validateHardwareBlockInput, unblockHardware);

// Client / Desktop routes
router.post("/validate", validateLimiter, validateClientLicenseInput, validateLicense);
router.post("/licenses/validate", validateLimiter, validateClientLicenseInput, validateLicense);
router.post("/desktop/refresh", refreshDesktopToken);
router.get("/desktop/check", desktopLicenseMiddleware, checkDesktopLicense);

export default router;

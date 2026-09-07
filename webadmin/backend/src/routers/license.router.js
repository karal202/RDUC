import express from "express";
import rateLimit from "express-rate-limit";
import {
  createLicense,
  getDashboard,
  getDatabaseHealth,
  getLicenses,
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

router.get("/health", getDatabaseHealth);
router.use(["/dashboard", "/licenses", "/logs"], authMiddleware);
router.get("/dashboard", getDashboard);
router.get("/licenses", getLicenses);
router.post("/licenses", createLicense);
router.put("/licenses/:id", updateLicense);
router.delete("/licenses/:id", deleteLicense);
router.post("/hardware-blocks", authMiddleware, blockHardware);
router.delete("/hardware-blocks/:hardwareId", authMiddleware, unblockHardware);
router.post("/validate", validateLimiter, validateLicense);
router.post("/licenses/validate", validateLimiter, validateLicense);
router.post("/desktop/refresh", refreshDesktopToken);
router.get("/desktop/check", desktopLicenseMiddleware, checkDesktopLicense);
router.get("/logs", getLogs);

export default router;

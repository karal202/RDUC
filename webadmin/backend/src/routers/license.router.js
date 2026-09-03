import express from "express";
import {
  createLicense,
  getDashboard,
  getDatabaseHealth,
  getLicenses,
  getLogs,
  updateLicense,
  validateLicense,
  refreshDesktopToken,
  checkDesktopLicense,
} from "../controllers/license.controller.js";
import { desktopLicenseMiddleware } from "../common/middleware/desktopLicense.middleware.js";

const router = express.Router();

router.get("/health", getDatabaseHealth);
router.get("/dashboard", getDashboard);
router.get("/licenses", getLicenses);
router.post("/licenses", createLicense);
router.put("/licenses/:id", updateLicense);
router.post("/validate", validateLicense);
router.post("/licenses/validate", validateLicense);
router.post("/desktop/refresh", refreshDesktopToken);
router.get("/desktop/check", desktopLicenseMiddleware, checkDesktopLicense);
router.get("/logs", getLogs);

export default router;

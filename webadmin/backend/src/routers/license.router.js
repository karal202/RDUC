import express from "express";
import {
  createLicense,
  getDashboard,
  getDatabaseHealth,
  getLicenses,
  getLogs,
  updateLicense,
  validateLicense,
} from "../controllers/license.controller.js";

const router = express.Router();

router.get("/health", getDatabaseHealth);
router.get("/dashboard", getDashboard);
router.get("/licenses", getLicenses);
router.post("/licenses", createLicense);
router.put("/licenses/:id", updateLicense);
router.post("/validate", validateLicense);
router.post("/licenses/validate", validateLicense);
router.get("/logs", getLogs);

export default router;

import express from "express";
import fs from "fs";
import path from "path";
import licenseRouter from "./license.router.js";
import authRouter from "./auth.router.js";

const rootRouter = express.Router();

const appPackageJsonPath = path.resolve(process.cwd(), "../../appdesktop/package.json");

rootRouter.get("/app-version", (req, res) => {
  try {
    const raw = fs.readFileSync(appPackageJsonPath, "utf-8");
    const pkg = JSON.parse(raw);

    return res.json({
      success: true,
      version: pkg.version || "0.0.0",
      name: pkg.name || "dawa-system-check",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể đọc version của app desktop.",
      error: error.message,
    });
  }
});

rootRouter.use("/license", licenseRouter);
rootRouter.use("/auth", authRouter);

export default rootRouter;

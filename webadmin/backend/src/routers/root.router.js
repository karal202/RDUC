import express from "express";
import fs from "fs";
import path from "path";
import licenseRouter from "./license.router.js";
import authRouter from "./auth.router.js";
import fileManagerRouter from "./fileManager.router.js";

const rootRouter = express.Router();

const GITHUB_RELEASES_URL = "https://api.github.com/repos/karal202/RDUC/releases/latest";
const RELEASE_CACHE_TTL_MS = 5 * 60 * 1000;
let releaseCache = { expiresAt: 0, value: null };

const getLocalVersion = () => {
  const candidatePaths = [
    path.resolve(process.cwd(), "../../appdesktop/package.json"),
    path.resolve(process.cwd(), "../appdesktop/package.json"),
    path.resolve(process.cwd(), "./appdesktop/package.json"),
    path.resolve(process.cwd(), "package.json"),
  ];

  for (const candidatePath of candidatePaths) {
    try {
      if (!fs.existsSync(candidatePath)) continue;
      const pkg = JSON.parse(fs.readFileSync(candidatePath, "utf-8"));
      if (pkg.version) return pkg.version;
    } catch {
      // Try the next candidate when the local package file is unavailable.
    }
  }

  return process.env.LATEST_APP_VERSION || "1.0.0";
};

const getLatestGitHubRelease = async () => {
  const now = Date.now();
  if (releaseCache.value && releaseCache.expiresAt > now) return releaseCache.value;

  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Dawa-Optimizer",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const response = await fetch(GITHUB_RELEASES_URL, { headers });
  if (!response.ok) throw new Error(`GitHub Releases API returned ${response.status}`);

  const release = await response.json();
  const executable = (release.assets || []).find((asset) => /\.exe$/i.test(asset.name));
  const value = {
    version: String(release.tag_name || "").replace(/^v/i, "") || getLocalVersion(),
    downloadUrl: executable?.browser_download_url || process.env.APP_DOWNLOAD_URL || null,
    releaseNotes: release.body || "",
    releaseUrl: release.html_url || null,
    updatedAt: release.published_at || release.created_at || new Date().toISOString(),
  };

  releaseCache = { expiresAt: now + RELEASE_CACHE_TTL_MS, value };
  return value;
};

rootRouter.get("/app-version", async (req, res) => {
  try {
    const release = await getLatestGitHubRelease();
    return res.json({
      success: true,
      name: "Dawa Optimizer",
      ...release,
      mandatory: process.env.APP_UPDATE_MANDATORY === "true",
    });
  } catch (error) {
    console.warn("Unable to fetch latest GitHub release:", error.message);
    return res.json({
      success: true,
      version: getLocalVersion(),
      name: "Dawa Optimizer",
      downloadUrl: process.env.APP_DOWNLOAD_URL || null,
      releaseNotes: process.env.APP_RELEASE_NOTES || "",
      mandatory: process.env.APP_UPDATE_MANDATORY === "true",
      updatedAt: new Date().toISOString(),
      source: "fallback",
    });
  }
});

rootRouter.use("/license", licenseRouter);
rootRouter.use("/auth", authRouter);
rootRouter.use("/file-manager", fileManagerRouter);

export default rootRouter;

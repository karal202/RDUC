import { verifyAccessToken } from "../helpers/jwt.helper.js";
import LicenseKey from "../../models/licenseKey.model.js";
import KeyDeviceMap from "../../models/keyDeviceMap.model.js";
import Device from "../../models/device.model.js";

export async function desktopLicenseMiddleware(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";
    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Thiếu access token." });
    }

    const token = authorization.slice("Bearer ".length).trim();
    const claims = verifyAccessToken(token);
    if (claims.type !== "desktop-access" || !claims.licenseId || !claims.deviceHash) {
      return res.status(401).json({ success: false, message: "Access token không hợp lệ." });
    }

    const license = await LicenseKey.findByPk(claims.licenseId);
    if (!license || license.status !== "active") {
      return res.status(403).json({ success: false, valid: false, message: "Key đã bị vô hiệu hóa." });
    }
    if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
      await license.update({ status: "expired" });
      return res.status(403).json({ success: false, valid: false, message: "Key đã hết hạn." });
    }

    const device = await Device.findOne({ where: { device_hash: claims.deviceHash } });
    const mapping = device
      ? await KeyDeviceMap.findOne({ where: { key_id: license.id, device_id: device.id, is_active: true } })
      : null;
    if (!mapping) {
      return res.status(403).json({ success: false, valid: false, message: "Thiết bị không còn được kích hoạt cho key." });
    }

    req.desktopLicense = license;
    req.desktopDeviceHash = claims.deviceHash;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Access token hết hạn hoặc không hợp lệ." });
  }
}

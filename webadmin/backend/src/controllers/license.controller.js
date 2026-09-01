import sequelize from "../common/squelize/connect.sequelize.js";
import Admin from "../models/admin.model.js";
import LicenseKey from "../models/licenseKey.model.js";
import Device from "../models/device.model.js";
import KeyDeviceMap from "../models/keyDeviceMap.model.js";
import ActivationLog from "../models/activationLog.model.js";
import {
  ensureKeyFormat,
  generateLicenseKey,
  encryptKey,
  decryptKey,
  normalizeKeyCode,
} from "../utils/licenseUtils.js";

const toDateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const logActivation = async ({ keyCode, deviceHash, ipAddress, result }) => {
  try {
    await ActivationLog.create({
      key_code: keyCode || null,
      device_hash: deviceHash || null,
      ip_address: ipAddress || null,
      result,
      created_at: new Date(),
    });
  } catch (error) {
    console.error("Activation log failed:", error.message);
  }
};

const normalizePublicIp = (ip) => {
  if (!ip) return "";
  let clean = String(ip).replace("::ffff:", "").trim();
  if (clean === "::1") return "127.0.0.1";
  if (clean.startsWith("192.168.") || clean.startsWith("10.") || clean.startsWith("172.")) {
    return clean;
  }
  return clean;
};

export async function getDatabaseHealth(req, res) {
  try {
    await sequelize.authenticate();
    return res.json({
      success: true,
      database: "connected",
      message: "Database ready (Sequelize ORM)",
    });
  } catch (error) {
    return res.json({
      success: false,
      database: "disconnected",
      message: error.message,
    });
  }
}

export async function getDashboard(req, res) {
  try {
    const [licensesCount, activeCount, revokedCount] = await Promise.all([
      LicenseKey.count(),
      LicenseKey.count({ where: { status: "active" } }),
      LicenseKey.count({ where: { status: "revoked" } }),
    ]);

    return res.json({
      success: true,
      data: {
        licensesCount,
        activeCount,
        revokedCount,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getLicenses(req, res) {
  try {
    const rows = await LicenseKey.findAll({
      include: [
        { model: Admin, as: "creator", attributes: ["id", "username"] },
        {
          model: KeyDeviceMap,
          as: "deviceMaps",
          include: [{ model: Device, as: "device", attributes: ["id", "device_hash", "device_name", "os_info", "last_seen"] }],
        },
      ],
      order: [["id", "DESC"]],
    });

    const decryptedRows = rows.map((rowItem) => {
      const plainRow = rowItem.get({ plain: true });
      const decryptedKey = decryptKey(plainRow.key_code);
      
      const activeDevices = (plainRow.deviceMaps || [])
        .filter((dm) => dm.is_active && dm.device)
        .map((dm) => ({
          device_id: dm.device.id,
          device_hash: dm.device.device_hash,
          device_name: dm.device.device_name,
          os_info: dm.device.os_info,
          activated_at: dm.activated_at,
        }));

      return {
        ...plainRow,
        key_code: decryptedKey,
        customer_name: plainRow.customer_name || "Khách lẻ",
        customer_contact: plainRow.customer_contact || "—",
        product_name: "DAWA System",
        created_by_name: plainRow.creator?.username || "Admin",
        active_devices: activeDevices,
        active_device_count: activeDevices.length,
        bound_ip_address: plainRow.bound_ip_address || null,
      };
    });

    return res.json({ success: true, data: decryptedRows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function createLicense(req, res) {
  try {
    const body = req.body || {};
    const maxDevices = Number(body.max_devices || 1);
    let createdBy = Number(body.created_by || 1);
    const customerName = String(body.customer_name || "").trim() || "Khách mới";
    const customerContact = String(body.customer_contact || "").trim() || "";

    let admin = await Admin.findByPk(createdBy);
    if (!admin) {
      const firstAdmin = await Admin.findOne({ order: [["id", "ASC"]] });
      if (firstAdmin) {
        createdBy = firstAdmin.id;
      } else {
        const newAdmin = await Admin.create({
          username: "admin",
          password_hash: "system_admin_hash",
          role: "super_admin",
          created_at: new Date(),
        });
        createdBy = newAdmin.id;
      }
    }

    let plainKeyCode = ensureKeyFormat(body.key_code || body.key || "");
    if (!plainKeyCode) {
      plainKeyCode = generateLicenseKey();
    }

    const expiresAt = toDateValue(body.expires_at);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const dbKeyCode = encryptKey(plainKeyCode);

        const record = await LicenseKey.create({
          key_code: dbKeyCode,
          customer_name: customerName,
          customer_contact: customerContact,
          max_devices: maxDevices,
          status: "active",
          expires_at: expiresAt,
          note: body.note || "",
          created_by: createdBy,
          created_at: new Date(),
          updated_at: new Date(),
        });

        const io = req.app.get("io");
        if (io) io.emit("license_updated");

        return res.status(201).json({
          success: true,
          message: `Đã tạo License Key cho người dùng ${customerName} thành công.`,
          data: {
            id: record.id,
            key: plainKeyCode,
            customer_name: customerName,
            customer_contact: customerContact,
            max_devices: maxDevices,
            expires_at: expiresAt ? expiresAt.toISOString() : null,
            note: body.note || "",
          },
        });
      } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
          plainKeyCode = generateLicenseKey();
          continue;
        }
        console.error("[CREATE LICENSE] Insert failed:", {
          name: error.name,
          code: error.code || error.parent?.code,
          sqlMessage: error.parent?.sqlMessage || error.message,
          table: "license_keys",
        });
        if (/product_id/i.test(String(error.parent?.sqlMessage || error.message || ""))) {
          console.error(
            "[CREATE LICENSE] 💡 Legacy 'product_id' column still exists. Restart the server so `connect.sequelize.js` auto ALTER TABLE DROP COLUMN product_id, or run it manually in MySQL.",
          );
        }
        throw error;
      }
    }

    return res.status(409).json({ success: false, message: "Không thể sinh key duy nhất sau nhiều lần thử." });
  } catch (error) {
    const detail = error.parent?.sqlMessage || error.message || "Lỗi không xác định";
    console.error("[CREATE LICENSE] FATAL:", detail);
    return res.status(500).json({
      success: false,
      message: `Không thể tạo license: ${detail}`,
      detail,
      code: error.parent?.code || error.code || error.name,
    });
  }
}

export async function updateLicense(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const { status, customer_name, customer_contact, max_devices, note, reset_bound_ip } = body;

    const license = await LicenseKey.findByPk(id);
    if (!license) {
      return res.status(404).json({ success: false, message: "License key không tồn tại" });
    }

    const updateData = {
      status: status || license.status,
      customer_name: customer_name !== undefined ? customer_name : license.customer_name,
      customer_contact: customer_contact !== undefined ? customer_contact : license.customer_contact,
      max_devices: max_devices ? Number(max_devices) : license.max_devices,
      note: note !== undefined ? note : license.note,
      updated_at: new Date(),
    };

    if (reset_bound_ip === true || body.bound_ip_address === null) {
      updateData.bound_ip_address = null;
    } else if (body.bound_ip_address !== undefined) {
      updateData.bound_ip_address = body.bound_ip_address;
    }

    await license.update(updateData);

    const io = req.app.get("io");
    if (io) {
      io.emit("license_updated");
      // Nếu admin vô hiệu hoặc thu hồi key → notify app desktop logout ngay
      if (updateData.status === "disabled" || updateData.status === "revoked") {
        const plainKeyCode = decryptKey(license.key_code);
        io.emit("license_revoked", { keyCode: plainKeyCode, keyId: license.id });
      }
    }

    return res.json({
      success: true,
      message: reset_bound_ip === true
        ? "Đã reset IP ràng buộc. Người dùng có thể kích hoạt trên IP mới."
        : "Cập nhật thông tin Người dùng / Key thành công!",
      data: license,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function validateLicense(req, res) {
  try {
    const body = req.body || {};
    const rawInputKey = String(body.key_code || body.key || body.license_key || "").trim();
    const plainInputKey = ensureKeyFormat(rawInputKey) || rawInputKey;
    const normInputKey = normalizeKeyCode(rawInputKey);
    const normInputKeyNoPrefix = normInputKey.startsWith("RDUC") ? normInputKey.slice(4) : normInputKey;

    const deviceHash = String(body.device_hash || body.hardware_id || "").trim();
    const deviceName = String(body.device_name || "").trim();
    const osInfo = String(body.os_info || "").trim();
    
    const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip || body.ip_address || "";
    const ipAddress = String(rawIp).replace("::ffff:", "").trim() || "127.0.0.1";

    if (!normInputKey || !deviceHash) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Thiếu thông tin Mã Key hoặc HWID thiết bị.",
      });
    }

    const allLicenses = await LicenseKey.findAll();

    console.log(`[VALIDATE KEY] Input raw: "${rawInputKey}", norm: "${normInputKey}", normNoPrefix: "${normInputKeyNoPrefix}", Total DB Keys: ${allLicenses.length}`);

    const matchedLicense = allLicenses.find((row) => {
      const decrypted = decryptKey(row.key_code);
      const normDecrypted = normalizeKeyCode(decrypted);
      const normDecryptedNoPrefix = normDecrypted.startsWith("RDUC") ? normDecrypted.slice(4) : normDecrypted;
      const normRaw = normalizeKeyCode(row.key_code);

      return (
        normDecrypted === normInputKey ||
        normDecryptedNoPrefix === normInputKey ||
        normDecrypted === normInputKeyNoPrefix ||
        normDecryptedNoPrefix === normInputKeyNoPrefix ||
        normRaw === normInputKey ||
        normRaw === normInputKeyNoPrefix
      );
    });

    if (!matchedLicense) {
      const dbKeySummary = allLicenses.map((r) => {
        const dec = decryptKey(r.key_code);
        return `#${r.id}: dec="${dec}" (normDec="${normalizeKeyCode(dec)}", raw="${r.key_code}")`;
      });
      console.log("[VALIDATE KEY FAILED] Key entered not found in DB. DB key list:", dbKeySummary);

      await logActivation({ keyCode: plainInputKey, deviceHash, ipAddress, result: "invalid_key" });
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Key không hợp lệ hoặc không tìm thấy trên hệ thống.",
      });
    }

    const license = matchedLicense;

    if (license.status === "disabled" || license.status === "revoked") {
      await logActivation({ keyCode: plainInputKey, deviceHash, ipAddress, result: "disabled" });
      return res.status(403).json({
        success: false,
        valid: false,
        message: "Key này đã bị vô hiệu hóa hoặc thu hồi bởi quản trị viên.",
      });
    }

    if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
      await LicenseKey.update({ status: "expired" }, { where: { id: license.id } });
      await logActivation({ keyCode: plainInputKey, deviceHash, ipAddress, result: "expired" });
      return res.status(410).json({
        success: false,
        valid: false,
        message: "Key kích hoạt đã hết hạn sử dụng.",
      });
    }

    const currentIpNorm = normalizePublicIp(ipAddress);
    const boundIpNorm = license.bound_ip_address ? normalizePublicIp(license.bound_ip_address) : null;

    if (boundIpNorm && boundIpNorm !== currentIpNorm) {
      await logActivation({ keyCode: plainInputKey, deviceHash, ipAddress, result: "ip_mismatch" });
      return res.status(403).json({
        success: false,
        valid: false,
        message: `Key này đã được kích hoạt duy nhất trên IP [${boundIpNorm}]. IP hiện tại của bạn [${currentIpNorm}] không khớp. Liên hệ admin để mở khóa IP nếu đổi nhà mạng.`,
        bound_ip: boundIpNorm,
        current_ip: currentIpNorm,
      });
    }

    let device = await Device.findOne({ where: { device_hash: deviceHash } });
    if (!device) {
      device = await Device.create({
        device_hash: deviceHash,
        device_name: deviceName || "Máy tính người dùng",
        os_info: osInfo || "Windows OS",
        first_seen: new Date(),
        last_seen: new Date(),
      });
    } else {
      await device.update({
        device_name: deviceName || device.device_name,
        os_info: osInfo || device.os_info,
        last_seen: new Date(),
      });
    }

    const existingMap = await KeyDeviceMap.findOne({
      where: { key_id: license.id, device_id: device.id },
    });

    const activeCount = await KeyDeviceMap.count({
      where: { key_id: license.id, is_active: true },
    });

    if (!existingMap && activeCount >= Number(license.max_devices || 1)) {
      await logActivation({ keyCode: plainInputKey, deviceHash, ipAddress, result: "device_limit" });
      return res.status(403).json({
        success: false,
        valid: false,
        message: `Key đã đạt giới hạn tối đa ${license.max_devices} thiết bị.`,
      });
    }

    if (existingMap) {
      if (!existingMap.is_active) {
        await existingMap.update({ is_active: true, activated_at: new Date() });
      }
    } else {
      await KeyDeviceMap.create({
        key_id: license.id,
        device_id: device.id,
        activated_at: new Date(),
        is_active: true,
      });
    }

    if (!boundIpNorm && currentIpNorm) {
      try {
        await LicenseKey.update(
          { bound_ip_address: currentIpNorm, updated_at: new Date() },
          { where: { id: license.id } },
        );
        license.bound_ip_address = currentIpNorm;
      } catch (ipErr) {
        console.warn("Could not save bound IP:", ipErr.message);
      }
    }

    await logActivation({ keyCode: plainInputKey, deviceHash, ipAddress, result: "success" });

    const io = req.app.get("io");
    if (io) io.emit("license_updated");

    return res.json({
      success: true,
      valid: true,
      message: `Kích hoạt thành công cho người dùng ${license.customer_name || 'Khách hàng'}!${!boundIpNorm && currentIpNorm ? ` (Đã ràng buộc IP ${currentIpNorm} cho key này)` : ''}`,
      data: {
        key_code: plainInputKey,
        customer_name: license.customer_name,
        product_name: "DAWA System",
        max_devices: Number(license.max_devices || 1),
        status: license.status,
        expires_at: license.expires_at,
        activated_ip: ipAddress,
        bound_ip_address: license.bound_ip_address || currentIpNorm,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, valid: false, message: error.message });
  }
}

export async function getLogs(req, res) {
  try {
    const logs = await ActivationLog.findAll({
      order: [["id", "DESC"]],
      limit: 100,
    });
    
    return res.json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

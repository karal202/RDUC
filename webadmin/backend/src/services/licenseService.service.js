import bcrypt from "bcrypt";
import crypto from "crypto";
import { Op } from "sequelize";
import LicenseKey from "../models/licenseKey.model.js";
import Admin from "../models/admin.model.js";
import Activation from "../models/activation.model.js";
import ActivationLog from "../models/activationLog.model.js";
import BlockedIp from "../models/blockedIp.model.js";
import BlockedHardware from "../models/blockedHardware.model.js";
import { BadRequestError, NotFoundError } from "../common/helpers/exception.helper.js";

const normalizeKey = (key) => String(key || "").trim();

const createKeyHash = (key) => bcrypt.hashSync(normalizeKey(key), 10);

const generateProductKey = () => {
  const randomPart = crypto.randomBytes(5).toString("hex").toUpperCase();
  const prefix = "RDUC";
  return `${prefix}-${randomPart.slice(0, 4)}-${randomPart.slice(4, 8)}-${randomPart.slice(8, 12)}`;
};

const keyToPrefix = (key) => {
  const normalized = normalizeKey(key);
  if (!normalized) return null;
  const parts = normalized.split("-");
  if (parts.length >= 2) {
    return parts[0];
  }
  return normalized.slice(0, 12).toUpperCase();
};

export const licenseService = {
  async getDashboardStats() {
    const [licensesCount, activeCount, revokedCount] = await Promise.all([
      LicenseKey.count(),
      LicenseKey.count({ where: { status: "active" } }),
      LicenseKey.count({ where: { status: "revoked" } }),
    ]);

    return {
      licensesCount,
      activeCount,
      revokedCount,
    };
  },

  async listLicenses() {
    const rows = await LicenseKey.findAll({
      include: [
        { model: Admin, as: "creator", attributes: ["id", "username", "email"] },
      ],
      order: [["created_at", "DESC"]],
    });

    return rows.map((item) => item.get({ plain: true }));
  },

  async createLicense(payload) {
    const { key, max_devices = 1, expires_at, created_by = null, customer_name, customer_contact } = payload;

    const licenseCode = normalizeKey(key) || generateProductKey();
    const keyHash = createKeyHash(licenseCode);
    const keyPrefix = keyToPrefix(licenseCode);

    const existing = await LicenseKey.findOne({ where: { key_hash: keyHash } });
    if (existing) {
      throw new BadRequestError("License key đã tồn tại trong hệ thống");
    }

    const record = await LicenseKey.create({
      key_hash: keyHash,
      key_prefix: keyPrefix,
      customer_name: customer_name || null,
      customer_contact: customer_contact || null,
      status: "unused",
      max_devices: Number(max_devices) || 1,
      expires_at: expires_at ? new Date(expires_at) : null,
      created_by: created_by ? Number(created_by) : null,
    });

    return {
      id: record.id,
      key: licenseCode,
      status: record.status,
      max_devices: record.max_devices,
      expires_at: record.expires_at,
      key_prefix: record.key_prefix,
      customer_name: record.customer_name,
      customer_contact: record.customer_contact,
    };
  },

  async validateLicense(payload) {
    const { key, hardware_id, device_name, ip_address } = payload;
    const normalizedKey = normalizeKey(key);

    if (!normalizedKey || !hardware_id) {
      throw new BadRequestError("key và hardware_id là bắt buộc");
    }

    const blockedHardware = await BlockedHardware.findOne({ where: { hardware_id } });
    if (blockedHardware) {
      await ActivationLog.create({
        key_code_input: normalizedKey,
        hardware_id,
        ip_address,
        result: "revoked",
      });
      throw new BadRequestError("Thiết bị này đã bị chặn khỏi hệ thống");
    }

    const blockedIp = await BlockedIp.findOne({ where: { ip_address } });
    if (blockedIp) {
      await ActivationLog.create({
        key_code_input: normalizedKey,
        hardware_id,
        ip_address,
        result: "revoked",
      });
      throw new BadRequestError("IP của bạn đang bị chặn");
    }

    const records = await LicenseKey.findAll();
    let license = null;

    for (const item of records) {
      const isMatch = bcrypt.compareSync(normalizedKey, item.key_hash);
      if (isMatch) {
        license = item;
        break;
      }
    }

    if (!license) {
      await ActivationLog.create({
        key_code_input: normalizedKey,
        hardware_id,
        ip_address,
        result: "invalid_key",
      });
      throw new BadRequestError("Key không hợp lệ");
    }

    if (license.status === "revoked") {
      await ActivationLog.create({
        license_key_id: license.id,
        key_code_input: normalizedKey,
        hardware_id,
        ip_address,
        result: "revoked",
      });
      throw new BadRequestError("Key đã bị thu hồi");
    }

    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      await LicenseKey.update({ status: "expired" }, { where: { id: license.id } });
      await ActivationLog.create({
        license_key_id: license.id,
        key_code_input: normalizedKey,
        hardware_id,
        ip_address,
        result: "expired",
      });
      throw new BadRequestError("Key đã hết hạn");
    }

    if (license.bound_ip_address && ip_address && license.bound_ip_address !== ip_address) {
      await ActivationLog.create({
        license_key_id: license.id,
        key_code_input: normalizedKey,
        hardware_id,
        ip_address,
        result: "ip_mismatch",
      });
      throw new BadRequestError(
        `Key đã ràng buộc với IP [${license.bound_ip_address}]. IP hiện tại [${ip_address}] không khớp. Liên hệ admin để mở khóa.`
      );
    }

    const activatedCount = await Activation.count({
      where: {
        license_key_id: license.id,
        is_active: true,
      },
    });

    if (activatedCount >= Number(license.max_devices || 1)) {
      await ActivationLog.create({
        license_key_id: license.id,
        key_code_input: normalizedKey,
        hardware_id,
        ip_address,
        result: "device_limit_exceeded",
      });
      throw new BadRequestError("Key đã đạt giới hạn thiết bị kích hoạt");
    }

    const existingActivation = await Activation.findOne({
      where: {
        license_key_id: license.id,
        hardware_id,
        is_active: true,
      },
    });

    if (!existingActivation) {
      await Activation.create({
        license_key_id: license.id,
        hardware_id,
        device_name: device_name || null,
        ip_address: ip_address || null,
      });
    }

    const licenseUpdate = {
      status: "active",
      activated_at: license.activated_at ? license.activated_at : new Date(),
    };
    if (!license.bound_ip_address && ip_address) {
      licenseUpdate.bound_ip_address = ip_address;
    }
    await LicenseKey.update(licenseUpdate, { where: { id: license.id } });

    await ActivationLog.create({
      license_key_id: license.id,
      key_code_input: normalizedKey,
      hardware_id,
      ip_address,
      result: "success",
    });

    return {
      success: true,
      message: "Kích hoạt thành công",
      license: {
        id: license.id,
        status: "active",
        max_devices: license.max_devices,
        expires_at: license.expires_at,
        customer_name: license.customer_name,
      },
    };
  },

  async listActivations() {
    return Activation.findAll({
      order: [["activated_at", "DESC"]],
      include: [{ model: LicenseKey, as: "licenseKey", attributes: ["id", "key_prefix", "status"] }],
    });
  },

  async listLogs() {
    return ActivationLog.findAll({
      order: [["created_at", "DESC"]],
      limit: 200,
    });
  },

  async blockIp(payload) {
    const { ip_address, reason, blocked_by = null } = payload;
    if (!ip_address) {
      throw new BadRequestError("ip_address là bắt buộc");
    }

    const [record] = await BlockedIp.findOrCreate({
      where: { ip_address },
      defaults: { reason: reason || null, blocked_by, expires_at: null },
    });

    return record;
  },

  async blockHardware(payload) {
    const { hardware_id, reason, blocked_by = null } = payload;
    if (!hardware_id) {
      throw new BadRequestError("hardware_id là bắt buộc");
    }

    const [record] = await BlockedHardware.findOrCreate({
      where: { hardware_id },
      defaults: { reason: reason || null, blocked_by },
    });

    return record;
  },

  async revokeLicense(licenseId) {
    const license = await LicenseKey.findByPk(licenseId);
    if (!license) {
      throw new NotFoundError("License key không tồn tại");
    }

    await LicenseKey.update({ status: "revoked" }, { where: { id: licenseId } });
    return { success: true, id: licenseId };
  },

  async getLicenseById(licenseId) {
    const license = await LicenseKey.findByPk(licenseId);

    if (!license) {
      throw new NotFoundError("License key không tồn tại");
    }

    return license.get({ plain: true });
  },
};

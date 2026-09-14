import { BadRequestError } from "../helpers/exception.helper.js";

/**
 * Helper kiểm tra định dạng email
 */
const isValidEmail = (email) => {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/**
 * Validate input cho Auth: Login
 */
export const validateLoginInput = (req, _res, next) => {
  const { username, email, password } = req.body || {};
  const loginName = String(username || email || "").trim();

  if (!loginName) {
    throw new BadRequestError("Tên đăng nhập hoặc email không được để trống");
  }

  if (loginName.length < 3 || loginName.length > 100) {
    throw new BadRequestError("Tên đăng nhập hoặc email phải từ 3 đến 100 ký tự");
  }

  if (!password || typeof password !== "string") {
    throw new BadRequestError("Mật khẩu không được để trống");
  }

  if (password.length < 6) {
    throw new BadRequestError("Mật khẩu phải có độ dài tối thiểu 6 ký tự");
  }

  next();
};

/**
 * Validate input cho Auth: Register
 */
export const validateRegisterInput = (req, _res, next) => {
  const { username, email, password, role } = req.body || {};
  const name = String(username || email || "").trim();

  if (!name) {
    throw new BadRequestError("Tên người dùng không được để trống");
  }

  if (name.length < 3 || name.length > 50) {
    throw new BadRequestError("Tên người dùng phải từ 3 đến 50 ký tự");
  }

  if (email && !isValidEmail(email)) {
    throw new BadRequestError("Định dạng email không hợp lệ");
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    throw new BadRequestError("Mật khẩu phải có độ dài tối thiểu 6 ký tự");
  }

  if (role && !["admin", "super_admin"].includes(role)) {
    throw new BadRequestError("Role người dùng không hợp lệ (chỉ chấp nhận admin hoặc super_admin)");
  }

  next();
};

/**
 * Validate input cho Auth: Forgot Password
 */
export const validateForgotPasswordInput = (req, _res, next) => {
  const { email } = req.body || {};
  if (!email || !isValidEmail(email)) {
    throw new BadRequestError("Email không hợp lệ");
  }
  next();
};

/**
 * Validate input cho License: Create
 */
export const validateLicenseCreateInput = (req, _res, next) => {
  const body = req.body || {};

  if (body.max_devices !== undefined) {
    const maxDevices = Number(body.max_devices);
    if (!Number.isInteger(maxDevices) || maxDevices < 1 || maxDevices > 1000) {
      throw new BadRequestError("Số thiết bị tối đa phải là số nguyên từ 1 đến 1000");
    }
  }

  if (body.expires_at) {
    const expires = new Date(body.expires_at);
    if (isNaN(expires.getTime())) {
      throw new BadRequestError("Ngày hết hạn (expires_at) không hợp lệ");
    }
  }

  if (body.customer_name && String(body.customer_name).length > 100) {
    throw new BadRequestError("Tên khách hàng không được vượt quá 100 ký tự");
  }

  if (body.customer_contact && String(body.customer_contact).length > 100) {
    throw new BadRequestError("Thông tin liên hệ không được vượt quá 100 ký tự");
  }

  if (body.key_code && String(body.key_code).length > 255) {
    throw new BadRequestError("Mã key tùy chỉnh không được vượt quá 255 ký tự");
  }

  next();
};

/**
 * Validate input cho License: Update
 */
export const validateLicenseUpdateInput = (req, _res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestError("ID bản quyền không hợp lệ");
  }

  const body = req.body || {};
  if (body.max_devices !== undefined) {
    const maxDevices = Number(body.max_devices);
    if (!Number.isInteger(maxDevices) || maxDevices < 1 || maxDevices > 1000) {
      throw new BadRequestError("Số thiết bị tối đa phải là số nguyên từ 1 đến 1000");
    }
  }

  if (body.expires_at) {
    const expires = new Date(body.expires_at);
    if (isNaN(expires.getTime())) {
      throw new BadRequestError("Ngày hết hạn (expires_at) không hợp lệ");
    }
  }

  next();
};

/**
 * Validate route param ID: Phải là số nguyên dương
 */
export const validateIdParam = (req, _res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestError("ID tham số không hợp lệ");
  }
  next();
};

/**
 * Validate input cho License: Client Validation
 */
export const validateClientLicenseInput = (req, _res, next) => {
  const body = req.body || {};
  const key = String(body.key_code || body.key || "").trim();
  const hardwareId = String(body.hardware_id || body.device_hash || body.hwid || "").trim();

  if (!key) {
    throw new BadRequestError("Mã bản quyền (key) không được để trống");
  }
  if (key.length > 255) {
    throw new BadRequestError("Mã bản quyền không hợp lệ (quá dài)");
  }

  if (!hardwareId) {
    throw new BadRequestError("Mã phần cứng (hardware_id) không được để trống");
  }
  if (hardwareId.length > 255) {
    throw new BadRequestError("Mã phần cứng không hợp lệ (quá dài)");
  }

  next();
};

/**
 * Validate input cho Hardware Block / Unblock
 */
export const validateHardwareBlockInput = (req, _res, next) => {
  const body = req.body || {};
  const hardwareId = String(body.hardware_id || body.device_hash || req.params.hardwareId || "").trim();

  if (!hardwareId) {
    throw new BadRequestError("Hardware ID không được để trống");
  }
  if (hardwareId.length > 255) {
    throw new BadRequestError("Hardware ID không hợp lệ");
  }

  next();
};

import { BadRequestError } from "../common/helpers/exception.helper.js";
import Admin from "../models/admin.model.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../common/helpers/jwt.helper.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

export const authService = {
  async login(req) {
    const { username, email, password } = req.body || {};
    const loginName = String(username || email || "").trim();

    const existingUser = await Admin.findOne({ where: { username: loginName } });

    if (!existingUser) {
      throw new BadRequestError("Tài khoản hoặc mật khẩu không chính xác");
    }

    const isPasswordValid = await bcrypt.compare(password || "", existingUser.password_hash);

    if (!isPasswordValid) {
      throw new BadRequestError("Tài khoản hoặc mật khẩu không chính xác");
    }

    // Cập nhật last_login
    await existingUser.update({ last_login: new Date() }).catch(() => {});

    // Tạo JWT payload
    const payload = {
      userId: existingUser.id,
      username: existingUser.username,
      role: existingUser.role,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: existingUser.id,
        username: existingUser.username,
        role: existingUser.role,
      },
    };
  },

  async register(req) {
    const { username, email, password, role } = req.body || {};
    const registerName = String(username || email || "").trim();

    if (!registerName || !password) {
      throw new BadRequestError("Tên đăng nhập và mật khẩu là bắt buộc");
    }

    const existingUser = await Admin.findOne({ where: { username: registerName } });

    if (existingUser) {
      throw new BadRequestError("Tài khoản đã tồn tại trong hệ thống");
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const assignedRole = role === "super_admin" ? "super_admin" : "admin";

    const newAdmin = await Admin.create({
      username: registerName,
      password_hash: hashPassword,
      role: assignedRole,
      created_at: new Date(),
    });

    return {
      id: newAdmin.id,
      username: newAdmin.username,
      role: newAdmin.role,
    };
  },

  async forgotPassword(req) {
    const { email } = req.body || {};
    const loginName = String(email || "").trim();

    const existingUser = await Admin.findOne({ where: { username: loginName } });

    if (!existingUser) {
      throw new BadRequestError("Tài khoản không tồn tại trong hệ thống");
    }

    const changePassCode = crypto.randomBytes(20).toString("hex");

    return {
      success: true,
      message: "Mã xác nhận đặt lại mật khẩu đã được tạo",
      code: changePassCode,
    };
  },

  async getInfo(req) {
    return req.user;
  },

  async refreshToken(req) {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const accessToken = req.accessToken || req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];

    if (!refreshToken) {
      throw new BadRequestError("Refresh token không tồn tại, vui lòng đăng nhập lại");
    }

    if (!accessToken) {
      throw new BadRequestError("Access token không tồn tại, vui lòng đăng nhập lại");
    }

    const decodeAccessToken = verifyAccessToken(accessToken, {
      ignoreExpiration: true,
    });
    const decodeRefreshToken = verifyRefreshToken(refreshToken);

    if (decodeAccessToken.userId !== decodeRefreshToken.userId) {
      throw new BadRequestError("Token không hợp lệ, vui lòng đăng nhập lại");
    }

    const userExist = await Admin.findByPk(decodeAccessToken.userId);
    if (!userExist) {
      throw new BadRequestError("Tài khoản không tồn tại, vui lòng đăng nhập lại");
    }

    const payload = {
      userId: userExist.id,
      username: userExist.username,
      role: userExist.role,
    };

    const accessTokenNew = signAccessToken(payload);
    return {
      accessToken: accessTokenNew,
      refreshToken: refreshToken,
    };
  },
};

import { authService } from "../services/auth.service.js";
import { responseSuccess } from "../common/helpers/response.helper.js";

// Cấu hình cookie an toàn chống XSS & CSRF
const isProduction = process.env.NODE_ENV === "production";
const COOKIE_OPTIONS = {
  httpOnly: true, // Chặn JS truy cập vào cookie (chống trộm token qua XSS)
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
  path: "/",
};

export const authController = {
  async login(req, res, next) {
    const { accessToken, refreshToken } = await authService.login(req);
    // Lưu token vào httpOnly cookie an toàn
    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
    res.cookie("accessToken", accessToken, COOKIE_OPTIONS);
    const response = responseSuccess(
      {
        accessToken,
        authenticated: true,
      },
      `Login successfully`,
    );
    res.status(response.statusCode).json(response);
  },

  async logout(req, res, next) {
    res.clearCookie("accessToken", { ...COOKIE_OPTIONS, maxAge: 0 });
    res.clearCookie("refreshToken", { ...COOKIE_OPTIONS, maxAge: 0 });
    const response = responseSuccess(null, "Logout successfully");
    res.status(response.statusCode).json(response);
  },

  async register(req, res, next) {
    const result = await authService.register(req);
    const response = responseSuccess(result, `Register successfully`);
    res.status(response.statusCode).json(response);
  },

  // api 1: forgot password
  // input: email
  // output: Không trả mã reset về client (tránh chiếm đoạt tài khoản)
  async forgotPassword(req, res, next) {
    await authService.forgotPassword(req);
    res.status(200).json({
      success: true,
      message: "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được xử lý.",
    });
  },
  // api 2: change password
  // input: email, mã change password, password mới
  // output: thay đổi password mới cho user

  async getInfo(req, res, next) {
    // console.log("req.user: ", req.user);
    const result = await authService.getInfo(req);
    const response = responseSuccess(result, `Get info successfully`);
    res.status(response.statusCode).json(response);
  },

  async refreshToken(req, res, next) {
    const { accessToken, refreshToken } = await authService.refreshToken(req);
    // lưu refresh token vào cookie
    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
    res.cookie("accessToken", accessToken, COOKIE_OPTIONS);
    const response = responseSuccess(
      {
        accessToken,
        // refreshToken
      },
      `Refresh token successfully`,
    );
    res.status(response.statusCode).json(response);
  },

  async googleCallback(req, res, next) {
    const { accessToken, refreshToken } = req.user;
    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
    res.cookie("accessToken", accessToken, COOKIE_OPTIONS);

    res.redirect("http://localhost:3000/login-callback");
  },
};

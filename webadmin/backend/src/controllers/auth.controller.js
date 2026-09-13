import { authService } from "../services/auth.service.js";
import { responseSuccess } from "../common/helpers/response.helper.js";

const isProduction = process.env.NODE_ENV === "production";

// Cấu hình cookies an toàn chống XSS và đánh cắp token
const COOKIE_OPTIONS = {
  httpOnly: true, // Chặn JS truy cập vào cookie chống XSS
  sameSite: isProduction ? "none" : "lax", // None khi chạy cross-site HTTPS giữa frontend và backend
  secure: isProduction, // Bắt buộc HTTPS (secure: true) trong production
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
};

export const authController = {
  async login(req, res, next) {
    const { accessToken, refreshToken } = await authService.login(req);
    // lưu refresh token vào cookie
    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
    res.cookie("accessToken", accessToken, COOKIE_OPTIONS);
    const response = responseSuccess(
      {
        accessToken,
        // refreshToken
      },
      `Login successfully`,
    );
    res.status(response.statusCode).json(response);
  },

  async register(req, res, next) {
    const result = await authService.register(req);
    const response = responseSuccess(result, `Register successfully`);
    res.status(response.statusCode).json(response);
  },

  // api 1: forgot password
  // input: email
  // output: gửi mã change password về response
  async forgotPassword(req, res, next) {
    const codeChangePass = await authService.forgotPassword(req);
    res.status(200).json({ codeChangePass });
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

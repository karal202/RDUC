import express from "express";
import rateLimit from "express-rate-limit";
import { authController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { protectMiddleware } from "../common/middleware/protect.middleware.js";
import { authCookie } from "../common/middleware/authCookie.middleware.js";
import passport from "passport";

const authRouter = express.Router();

// Strict Rate Limiting: Chống brute-force mật khẩu admin
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // Tối đa 5 lần thử đăng nhập thất bại
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  message: {
    success: false,
    message: "Quá nhiều lần thử đăng nhập thất bại. Vui lòng thử lại sau 15 phút.",
  },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  message: {
    success: false,
    message: "Quá nhiều yêu cầu cấp lại mật khẩu. Vui lòng thử lại sau 15 phút.",
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  message: {
    success: false,
    message: "Quá nhiều yêu cầu tạo tài khoản. Vui lòng thử lại sau 1 giờ.",
  },
});

// http://localhost:3069/api/auth/login
authRouter.post("/login", loginLimiter, authController.login);
// http://localhost:3069/api/auth/logout
authRouter.post("/logout", authController.logout);
// http://localhost:3069/api/auth/register
authRouter.post("/register", registerLimiter, authController.register);
// http://localhost:3069/api/auth/forgot-password
authRouter.post("/forgot-password", forgotPasswordLimiter, authController.forgotPassword);

authRouter.get("/get-info", authMiddleware, authController.getInfo);

authRouter.post("/refresh-token", authController.refreshToken);

//khi user click nút login -> gọi api get bằng thanh url
//passport sẽ được kích hoạt, điều hướng người dùng tới trang chọn tài khoản google, dùng scope để xác định thông tin nào của người dùng sẽ được trả về sau khi đăng nhập thành công
authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false, // không sử dụng session để xử lý đăng nhập, để BE tự xử lý jwt
  }),
  // function (req, res) {
  //   console.log("middleware tiếp theo sau khi verify thành công", req.user);
  //   // Successful authentication, redirect home.
  //   // res.redirect("/");
  // },
  authController.googleCallback,
);

export default authRouter;

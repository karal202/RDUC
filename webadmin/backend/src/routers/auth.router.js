import express from "express";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { authController } from "../controllers/auth.controller.js";
import { authCookie } from "../common/middleware/authCookie.middleware.js";
import {
  validateLoginInput,
  validateRegisterInput,
  validateForgotPasswordInput,
} from "../common/middleware/validation.middleware.js";

const authRouter = express.Router();

// Rate limiter chống brute-force đăng nhập / đăng ký
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10, // Tối đa 10 lần thử từ 1 IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  message: {
    success: false,
    message: "Quá nhiều yêu cầu đăng nhập/đăng ký. Vui lòng thử lại sau 15 phút.",
  },
});

// Authentication endpoints có rate limit và input validation
authRouter.post("/login", authLimiter, validateLoginInput, authController.login);
authRouter.post("/register", authLimiter, validateRegisterInput, authController.register);
authRouter.post("/forgot-password", authLimiter, validateForgotPasswordInput, authController.forgotPassword);

authRouter.get("/get-info", authCookie, authController.getInfo);
authRouter.post("/refresh-token", authController.refreshToken);

// Google OAuth
authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  authController.googleCallback,
);

export default authRouter;

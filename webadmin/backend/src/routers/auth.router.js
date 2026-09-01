import express from "express";
import { authController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { protectMiddleware } from "../common/middleware/protect.middleware.js";
import { authCookie } from "../common/middleware/authCookie.middleware.js";
import passport from "passport";
const authRouter = express.Router();

// Tạo route CRUD
// http://localhost:3069/api/auth/login
authRouter.post("/login", authController.login);
// http://localhost:3069/api/auth/register
authRouter.post("/register", authController.register);
// http://localhost:3069/api/auth/forgot-password
authRouter.post("/forgot-password", authController.forgotPassword);

authRouter.get("/get-info", authCookie, authController.getInfo);

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

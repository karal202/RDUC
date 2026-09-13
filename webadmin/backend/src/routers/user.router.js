import express from "express";
import { userController } from "../controllers/user.controller.js";
import { uploadDiskStorage } from "../common/multer/disk-storage.multer.js";
import { uploadMemoryStorage } from "../common/multer/memory-storage.multer.js";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { requireAdmin } from "../common/middleware/role.middleware.js";
import { validateIdParam } from "../common/middleware/validation.middleware.js";

const userRouter = express.Router();

// Bắt buộc xác thực đăng nhập cho toàn bộ user routes
userRouter.use(authMiddleware);

// Route CRUD người dùng (yêu cầu quyền quản trị viên)
userRouter.get("/", requireAdmin, userController.findAll);
userRouter.get("/:id", requireAdmin, validateIdParam, userController.findOne);

// Route cập nhật avatar
userRouter.post(
  "/avatar-local",
  uploadDiskStorage.single("avatar"),
  userController.avatarLocal,
);

userRouter.post(
  "/avatar-cloud",
  uploadMemoryStorage.single("avatar"),
  userController.avatarCloud,
);

export default userRouter;

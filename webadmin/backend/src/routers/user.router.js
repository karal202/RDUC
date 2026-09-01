import express from "express";
import { userController } from "../controllers/user.controller.js";
import multer from "multer";
import { uploadDiskStorage } from "../common/multer/disk-storage.multer.js";
import { authCookie } from "../common/middleware/authCookie.middleware.js";
import { uploadMemoryStorage } from "../common/multer/memory-storage.multer.js";

const userRouter = express.Router();

// Tạo route CRUD
userRouter.get("/", userController.findAll);

userRouter.get("/:id", userController.findOne);

userRouter.post(
  "/avatar-local",
  authCookie,
  uploadDiskStorage.single("avatar"),
  userController.avatarLocal,
);

userRouter.post(
  "/avatar-cloud",
  authCookie,
  uploadMemoryStorage.single("avatar"),
  userController.avatarCloud,
);

export default userRouter;

import { createServer } from "http";
import { Server } from "socket.io";
import { verifyAccessToken } from "../helpers/jwt.helper.js";
import Admin from "../../models/admin.model.js";

export const initSocket = (app) => {
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    /* options */
  });

  io.on("connection", (socket) => {
    console.log("socket: ", socket.id);

    socket.on("CREATE_ROOM", async (data, cb) => {
      try {
        const { targetUserIds, accessToken, name } = data;

        const { userId } = verifyAccessToken(accessToken, {
          ignoreExpiration: true,
        });
        
        const userExits = await Admin.findOne({
          where: { id: userId },
        });

        if (!userExits || userExits.isDeleted) {
          throw new Error("Người dùng không tồn tại");
        }

        const targetUserIdsSet = new Set([...targetUserIds, userId]);
        const targetUserIdsUnique = Array.from(targetUserIdsSet);

        // TODO: Implement chat group functionality with Sequelize models
        cb({
          status: "error",
          data: null,
          message: "Chat functionality temporarily disabled - Prisma migration in progress",
        });
      } catch (error) {
        cb({
          status: "error",
          data: null,
          message: error.message || "Lỗi không xác định",
        });
      }
    });

    socket.on("JOIN_ROOM", async (data, cb) => {
      const { chatGroupId, accessToken } = data;
      const { userId } = verifyAccessToken(accessToken, {
        ignoreExpiration: true,
      });
      
      const userExits = await Admin.findOne({
        where: { id: userId },
      });
      
      if (!userExits || userExits.isDeleted) {
        throw new Error("Người dùng không tồn tại");
      }

      socket.join(`chat: ${chatGroupId}`);
      console.log("tất cả các rooms", io.sockets.adapter.rooms);
      console.log("join room", { chatGroupId, accessToken });
    });

    socket.on("SEND_MESSAGE", async (data, cb) => {
      const { chatGroupId, accessToken, message } = data;
      const { userId } = verifyAccessToken(accessToken, {
        ignoreExpiration: true,
      });
      
      const userExits = await Admin.findOne({
        where: { id: userId },
      });
      
      if (!userExits || userExits.isDeleted) {
        throw new Error("Người dùng không tồn tại");
      }

      const createdAt = new Date().toISOString();

      io.to(`chat: ${chatGroupId}`).emit(`SEND_MESSAGE`, {
        messageText: message,
        userIdSender: userExits.id,
        chatGroupId: chatGroupId,
        createdAt: createdAt,
      });

      // TODO: Implement message saving with Sequelize models
      console.log("Send message", { chatGroupId, message, accessToken });
    });
  });

  return httpServer;
};

import { createServer } from "http";
import { Server } from "socket.io";
import { verifyAccessToken } from "../helpers/jwt.helper.js";
import { prisma } from "../prisma/connect.prisma.js";

export const initSocket = (app) => {
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    /* options */
  });

  //lắng nghe sự kiện kết nối từ client thông qua socket.io
  //.emit để gửi sự kiện từ server đến client, .on để lắng nghe sự kiện từ client gửi lên server
  // on (eventName, cb)
  io.on("connection", (socket) => {
    console.log("socket: ", socket.id);

    socket.on("CREATE_ROOM", async (data, cb) => {
      try {
        const { targetUserIds, accessToken, name } = data;

        //xử lý thông tin accessToken và tìm user
        const { userId } = verifyAccessToken(accessToken, {
          ignoreExpiration: true,
        }); //bỏ qua kiểm tra hết hạn của accessToken để lấy được userId, vì có thể accessToken đã hết hạn nhưng vẫn muốn tạo phòng chat mới
        const userExits = await prisma.users.findUnique({
          where: {
            id: userId,
          },
        });

        if (!userExits || userExits.isDeleted) {
          throw new Error("Người dùng không tồn tại"); //nếu user không tồn tại thì sẽ trả về lỗi
        }

        //xử lý targetUserIds thành unique array
        // set là tương tự như array, nhưng mà dữ liệu bên trong set sẽ không được phép trùng lặp
        const targetUserIdsSet = new Set([...targetUserIds, userId]); //sử dụng set để loại bỏ các id trùng lặp giữa targetUserIds và userId
        const targetUserIdsUnique = Array.from(targetUserIdsSet);

        if (targetUserIdsUnique.length === 2) {
          //chat nhóm 2 người (1-1)
          //kiểm tra xem chatGroup đã tồn tại chưa
          let chatGroup = await prisma.chatGroups.findFirst({
            where: {
              ChatGroupMembers: {
                //every: kiểm tra tất các phần tử/ bản ghi trong db đều phải thỏa điều kiện
                //none: kiểm tra tất cả phần tử/ bản ghi trong db đều không thỏa điều kiện
                //some: ít nhất một phần tử/ bản ghi trong db thỏa điều kiện
                every: {
                  userId: {
                    in: targetUserIdsUnique,
                  },
                },
              },
            },
          });
          // nếu chưa thì sẽ tạo mới
          if (!chatGroup) {
            chatGroup = await prisma.chatGroups.create({
              data: {
                ownerId: userExits.id,
              },
            });
            await prisma.chatGroupMembers.createMany({
              data: [
                { userId: targetUserIdsUnique[0], chatGroupId: chatGroup.id },
                {
                  userId: targetUserIdsUnique[1],
                  chatGroupId: chatGroup.id,
                },
              ],
            });
          }
          //nếu đã tồn tại thì sẽ đi tiếp
          //cho socket join vào room
          socket.join(chatGroup.id);

          cb({
            status: "success",
            message: "Tạo phòng chat thành công",
            data: {
              chatGroupId: chatGroup.id,
            },
          });
          console.log("rooms", io.sockets.adapter.rooms);

          console.log("data from client: ", {
            targetUserIds: targetUserIdsUnique,
            accessToken,
            userId,
            chatGroup,
          });
        } else {
          // if (!name) {
          //   throw new Error("Vui lòng nhập tên nhóm chat");
          // }
          //chat nhóm nhiều hơn 2 người
          const chatGroup = await prisma.chatGroups.create({
            data: {
              name: name || "Nhóm chat mới",
              ownerId: userExits.id,
            },
          });

          await prisma.chatGroupMembers.createMany({
            data: targetUserIdsUnique.map((userId) => {
              return { userId: userId, chatGroupId: chatGroup.id };
            }),
          });

          socket.join(`chat: ${chatGroupId}`);

          cb({
            status: "success",
            message: "Tạo phòng chat thành công",
            data: {
              chatGroupId: chatGroup.id,
            },
          });
        }
      } catch (error) {
        cb({
          status: "error",
          data: null,
          message: error.message || "Lỗi không xác định",
        });
      }
    });

    //khi đã group chat
    //user click nhóm hoặc cá nhân thì sẽ kết nối vào 1 room
    socket.on("JOIN_ROOM", async (data, cb) => {
      const { chatGroupId, accessToken } = data;
      const { userId } = verifyAccessToken(accessToken, {
        ignoreExpiration: true,
      });
      const userExits = await prisma.users.findUnique({
        where: {
          id: userId,
        },
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
      //nếu muốn cải thiện tốc độ nhanh hơn, sẽ tối ưu chỗ prisma.user.findunique
      // lưu thông tin user vào cache redis 5-10s, chủ yếu để giảm số lần phải req query đến db
      // query tới db sẽ nhiều thời gian
      const userExits = await prisma.users.findUnique({
        where: {
          id: userId,
        },
      });
      if (!userExits || userExits.isDeleted) {
        throw new Error("Người dùng không tồn tại");
      }

      const createdAt = new Date().toISOString();

      //to: chỉ gửi sự kiện cho các socket trong room đó
      //emit: gửi sự kiện có eventName đến client (FE)
      //on để lắng nghe sự kiện có eventName
      //cần được chạy nhanh nhất có thể để đảm bảo trải nghiệm người dùng
      io.to(`chat: ${chatGroupId}`).emit(`SEND_MESSAGE`, {
        messageText: message,
        userIdSender: userExits.id,
        chatGroupId: chatGroupId,
        createdAt: createdAt,
      });

      //để sau io.to để được tối ưu tốc độ tốt nhất
      await prisma.chatMessages.create({
        data: {
          chatGroupId: chatGroupId,
          messageText: message,
          userIdSender: userExits.id,
          createdAt: createdAt,
        },
      });

      console.log("Send message", { chatGroupId, message, accessToken });
    });
  });

  return httpServer;
};

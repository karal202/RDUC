import { UnauthorizedError } from "../helpers/exception.helper.js";
import { verifyAccessToken } from "../helpers/jwt.helper.js";
import { prisma } from "../prisma/connect.prisma.js";

// nhận request từ client
export const authMiddleware = async (req, res, next) => {
  // B1: đọc token từ header Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  // console.log("authHeader: ", authHeader);
  // B2: kiểm tra token có hợp lệ không
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Vui lòng đăng nhập để tiếp tục");
  }

  // tách Bearer ra khỏi token
  const accessToken = authHeader.split(" ")[1];

  // xác thực token
  const decoded = verifyAccessToken(accessToken);

  //cách 1:
  // găn payload vừa giải mã vào req.user để các middleware
  // sau dùng tới
  //   req.user = decoded;

  // cách 2:
  const userExist = await prisma.users.findUnique({
    where: {
      id: decoded.userId,
    },
  });

  if (!userExist) {
    throw new UnauthorizedError("Tài khoản không hợp lệ, vui lòng thử lại");
  }
  
  req.user = userExist;

  next();
};

import { UnauthorizedError } from "../helpers/exception.helper.js";
import { verifyAccessToken } from "../helpers/jwt.helper.js";
import { prisma } from "../prisma/connect.prisma.js";

export const authCookie = async (req, res, next) => {
  const { accessToken } = req.cookies;

  if (!accessToken) {
    throw new UnauthorizedError("Không có token");
  }

  // kiểm tra token
  const decode = verifyAccessToken(accessToken);

  // kiểm tra người dùng có trong db hay không
  const userExits = await prisma.users.findUnique({
    where: {
      id: decode.userId,
    },
  });

  if (!userExits) {
    throw new UnauthorizedError("Người dùng không tồn tại");
  }

  req.user = userExits;
  // console.log("protect", { accessToken, decode, userExits });

  next();
};

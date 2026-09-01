import { UnauthorizedError } from "../helpers/exception.helper.js";
import { verifyAccessToken } from "../helpers/jwt.helper.js";

export const protectMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  // console.log("authHeader: ", authHeader);
  // B2: kiểm tra token có hợp lệ không
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Vui lòng đăng nhập để tiếp tục");
  }

  // tách Bearer ra khỏi token
  const accessToken = authHeader.split(" ")[1];

  // xác thực token
  const decoded = verifyAccessToken(accessToken, { ignoreExpiration: true });

  req.accessToken = accessToken;
  next();
};

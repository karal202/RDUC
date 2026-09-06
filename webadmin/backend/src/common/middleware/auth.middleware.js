import { UnauthorizedError } from "../helpers/exception.helper.js";
import { verifyAccessToken } from "../helpers/jwt.helper.js";
import Admin from "../../models/admin.model.js";

// nhận request từ client
export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let accessToken = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    accessToken = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies.accessToken) {
    accessToken = req.cookies.accessToken;
  }

  if (!accessToken) {
    throw new UnauthorizedError("Vui lòng đăng nhập để tiếp tục");
  }

  // xác thực token
  const decoded = verifyAccessToken(accessToken);

  //cách 1:
  // găn payload vừa giải mã vào req.user để các middleware
  // sau dùng tới
  //   req.user = decoded;

  // cách 2:
  const userExist = await Admin.findByPk(decoded.userId, {
    attributes: { exclude: ["password_hash"] },
  });

  if (!userExist) {
    throw new UnauthorizedError("Tài khoản không hợp lệ, vui lòng thử lại");
  }
  
  req.user = userExist;

  next();
};

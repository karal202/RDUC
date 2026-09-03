import { UnauthorizedError } from "../helpers/exception.helper.js";
import { verifyAccessToken } from "../helpers/jwt.helper.js";
import Admin from "../../models/admin.model.js";

export const authCookie = async (req, res, next) => {
  const { accessToken } = req.cookies;

  if (!accessToken) {
    throw new UnauthorizedError("Không có token");
  }

  // kiểm tra token
  const decode = verifyAccessToken(accessToken);

  // kiểm tra người dùng có trong db hay không
  const userExits = await Admin.findByPk(decode.userId, {
    attributes: { exclude: ["password_hash"] },
  });

  if (!userExits) {
    throw new UnauthorizedError("Người dùng không tồn tại");
  }

  req.user = userExits;
  // console.log("protect", { accessToken, decode, userExits });

  next();
};

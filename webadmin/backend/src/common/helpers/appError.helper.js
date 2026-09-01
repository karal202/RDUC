import { responseErr } from "./response.helper.js";
import jwt from "jsonwebtoken";
import { statusCodes } from "./status-code.helper.js";
//middleware bắt lỗi, không được phép để xảy ra lỗi mà không được xử lý, không được tồn tại lỗi từ logic
export const appError = (err, req, res, next) => {
  console.log("Lỗi ở middleware đặc biệt xử lý lỗi:", err);

  // console.log("app err", {
  //   message: err.message,
  //   statusCode: err.statusCode,
  //   stack: err.stack,
  // });

  //lỗi do token không hợp lệ
  if (err instanceof jwt.JsonWebTokenError) {
    //class JwtError là bắt tất cả các lỗi liên quan đến jwt, bao gồm tất cả các lỗi liên quan token
    err.statusCode = statusCodes.UNAUTHORIZED; //401: fe sẽ xóa token và yêu cầu đăng nhập lại
  }

  //lỗi do token hết hạn
  if (err instanceof jwt.TokenExpiredError) {
    //class tokenExpiredError chỉ bắt lỗi liên quan đến token hết hạn
    err.statusCode = statusCodes.FORBIDDEN; //403: fe sẽ refresh token
  }

  const response = responseErr(err?.message, err?.statusCode, err?.stack);

  res.status(response.statusCode).json(response);
};

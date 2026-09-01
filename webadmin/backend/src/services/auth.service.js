import { BadRequestError } from "../common/helpers/exception.helper.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../common/helpers/jwt.helper.js";
import { prisma } from "../common/prisma/connect.prisma.js";
import bcrypt from "bcrypt";
// crypto
import crypto from "crypto";

export const authService = {
  async login(req) {
    const { email, password } = req.body;
    // console.log(email, password);
    //kiểm tra email xem có tồn tại không
    //nếu chưa tồn tại thì trả lỗi, kêu người dùng đăng ký
    //nếu đã tồn tại thì so sánh password
    const existingUser = await prisma.users.findUnique({
      where: {
        email: email,
      },
      omit: {
        password: false,
      },
    });

    if (!existingUser) {
      // throw new BadRequestError(`Account not valid, please try again`);
      throw new BadRequestError(`Người dùng không tồn tại, vui lòng đăng ký`);
    }

    const isPasswordValid = bcrypt.compareSync(password, existingUser.password); //true

    if (!isPasswordValid) {
      // throw new BadRequestError(`Account not valid, please try again.`);
      throw new BadRequestError(
        `Thông tin người dùng không đúng, vui lòng thử lại`,
      );
    }

    // tạo access token
    // B1: tạo payload chứa thông tin: userId, email
    const payload = {
      userId: existingUser.id,
      email: existingUser.email,
    };
    // B2: tạo access token từ payload
    const accessToken = signAccessToken(payload);

    // tạo refresh token từ payload
    const refreshToken = signRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
    };
  },

  async register(req) {
    const { email, password, fullname } = req.body;
    console.log(email, password, fullname);

    //kiểm tra email đã tồn tại chưa, nếu đã tồn tại thì trả về lỗi, nếu chưa tồn tại thì tạo mới user
    const existingUser = await prisma.users.findUnique({
      where: {
        email: email,
      },
    });

    //hash: băm ví dụ 123456 -> OIUHOPSHFDUGDOFHUGDFG -> lksDHFSoidhfsdfohSF -> ... ->IUdghsfiuDGFI
    //bcrypt
    //brute force
    //KHÔNG THỂ DỊCH NGƯỢC
    //SO SÁNH
    const hashPassword = bcrypt.hashSync(password, 10);

    //encrupt: MÃ HÓA -> token
    // có thể dịch ngược để lấy dữ liệu

    if (existingUser) {
      throw new BadRequestError(`Người dùng đã tồn tại, vui lòng đăng nhập`);
    }

    const newUser = await prisma.users.create({
      data: {
        email: email,
        password: hashPassword,
        fullName: fullname,
      },
    });

    return true;
  },

  async forgotPassword(req) {
    const { email } = req.body;

    // B2: kiểm tra email có tồn tại không
    const existingUser = await prisma.users.findUnique({
      where: {
        email: email,
      },
      omit: {
        codeChangePass: false,
      },
    });

    if (!existingUser) {
      throw new BadRequestError("Email không tồn tại trong hệ thống");
    }

    // B3: tạo mã change password => crypto
    const changePassCode = crypto.randomBytes(20).toString("hex"); // tạo ra 1 chuỗi ngẫu nhiên có độ dài 40 ký tự

    // B4: lưu mã change pass vào db
    await prisma.users.update({
      where: { email: email },
      data: { codeChangePass: changePassCode },
    });

    // B5-optional: gửi mã change pass về email

    return changePassCode;
  },

  async getInfo(req) {
    return req.user;
  },

  async refreshToken(req) {
    const { refreshToken } = req.cookies;
    const accessToken = req.accessToken || req.cookies.accessToken;

    if (!refreshToken) {
      throw new BadRequestError(
        "Refresh token không tồn tại, vui lòng đăng nhập lại",
      );
    }

    if (!accessToken) {
      throw new BadRequestError(
        "Access token không tồn tại, vui lòng đăng nhập lại",
      );
    }

    const decodeAccessToken = verifyAccessToken(accessToken, {
      ignoreExpiration: true,
    });
    const decodeRefreshToken = verifyRefreshToken(refreshToken);

    if (decodeAccessToken.userId !== decodeRefreshToken.userId) {
      throw new BadRequestError("Token không hợp lệ, vui lòng đăng nhập lại");
    }

    //trường hợp 1: trả về 2 token hoàn toàn mới khi access token hết hạn
    // refresh token sẽ luôn được làm mới
    // nếu trong khoảng thời gian không sử dụng -> refresh token hết hạn -> yêu cầu đăng nhập lại

    //trường hợp 2: chỉ trả về access token mới, refresh token vẫn giữ nguyên
    // access token hết hạn -> làm mới access token bằng refresh token -> refresh token sẽ không được gia hạn
    // nếu refresh token hết hạn -> yêu cầu đăng nhập lại

    const userExist = await prisma.users.findUnique({
      where: {
        id: decodeAccessToken.userId,
      },
    });

    const payload = {
      userId: userExist.id,
      email: userExist.email,
    };

    const accessTokenNew = signAccessToken(payload);
    // const refreshTokenNew = signRefreshToken(payload);
    return {
      accessToken: accessTokenNew,
      refreshToken: refreshToken,
    };
  },
};

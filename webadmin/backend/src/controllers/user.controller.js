import { responseSuccess } from "../common/helpers/response.helper.js";
import { userService } from "../services/user.service.js";

export const userController = {
  async findAll(req, res, next) {
    const result = await userService.findAll(req);
    const response = responseSuccess(result, `Get all users successfully`);
    res.status(response.statusCode).json(response);
  },

  async findOne(req, res, next) {
    const result = await userService.findOne(req);
    const response = responseSuccess(result, `Get user by id successfully`);
    res.status(response.statusCode).json(response);
  },

  async avatarLocal(req, res, next) {
    const result = await userService.avatarLocal(req);
    const response = responseSuccess(
      result,
      `Upload avatar locally successfully`,
    );
    res.status(response.statusCode).json(response);
  },

  async avatarCloud(req, res, next) {
    const result = await userService.avatarCloud(req);
    const response = responseSuccess(
      result,
      `Upload avatar to cloud successfully`,
    );
    res.status(response.statusCode).json(response);
  },
};

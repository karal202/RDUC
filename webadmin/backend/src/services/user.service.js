import path from "path";
import { BadRequestError } from "../common/helpers/exception.helper.js";
import sequelize from "../common/squelize/connect.sequelize.js";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import Admin from "../models/admin.model.js";

export const userService = {
  async findAll(req) {
    let { page, pageSize, filters } = req.query;
    
    const pageDefault = 1;
    const pageSizeDefault = 10;
    
    page = Number(page) || pageDefault;
    pageSize = Number(pageSize) || pageSizeDefault;
    
    if (page < 1) page = pageDefault;
    if (pageSize < 1) pageSize = pageSizeDefault;
    
    const index = (page - 1) * pageSize;
    
    try {
      filters = JSON.parse(filters);
    } catch (err) {
      filters = {};
    }
    
    const where = { ...filters, isDeleted: false };
    
    const res = await Admin.findAll({
      where: where,
      offset: index,
      limit: pageSize,
    });
    
    const totalItems = await Admin.count({ where: where });
    const totalPages = Math.ceil(totalItems / pageSize);
    
    return {
      items: res,
      totalItems: totalItems,
      totalPages: totalPages,
      page: page,
      pageSize: pageSize,
    };
  },

  async findOne(req) {
    const { id } = req.params;
    
    const user = await Admin.findOne({
      where: { id: Number(id) },
    });
    
    return user;
  },

  async avatarLocal(req) {
    if (!req.file) {
      throw new BadRequestError(`File is required`);
    }
    
    if (req.user.avatar) {
      const oldFilePath = path.join("public/images", req.user.avatar);
      
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      
      cloudinary.uploader.destroy(req.user.avatar);
    }
    
    await Admin.update(
      { avatar: req.file.filename },
      { where: { id: req.user.id } }
    );
    
    return `http://localhost:3069/images/${req.file.filename}`;
  },

  async avatarCloud(req) {
    if (!req.file) {
      throw new BadRequestError(`File is required`);
    }
    
    if (req.user.avatar) {
      const oldFilePath = path.join("public/images", req.user.avatar);
      
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      
      cloudinary.uploader.destroy(req.user.avatar);
    }
    
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "node_55" }, (error, uploadResult) => {
          if (error) {
            return reject(error);
          }
          return resolve(uploadResult);
        })
        .end(req.file.buffer);
    });
    
    await Admin.update(
      { avatar: uploadResult.public_id },
      { where: { id: req.user.id } }
    );
    
    return uploadResult.secure_url;
  },
};

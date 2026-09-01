import { use } from "react";
import { buildQueryPrismaHelper } from "../common/helpers/build-query-prisma.helper.js";
import { prisma } from "../common/prisma/connect.prisma.js";

export const chatGroupService = {
  async findAll(req) {
    const { page, pageSize, index, where } = buildQueryPrismaHelper(req);

    const res = await prisma.chatGroups.findMany({
      where: {
        ...where,
        ChatGroupMembers: {
          some: {
            usersId: req.userId,
          },
        },
      },
      skip: index,
      take: pageSize,
      include: {
        ChatGroupMembers: {
          include: {
            Users: true,
          },
        },
      },
    });

    const totalItems = await prisma.chatGroups.count({
      where: {
        ...where,
        ChatGroupMembers: {
          some: {
            usersId: req.userId,
          },
        },
      },
    });

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
    return `This action returns a id: ${req.params.id} chatGroup`;
  },

  async update(req) {
    return `This action updates a id: ${req.params.id} chatGroup`;
  },

  async remove(req) {
    return `This action removes a id: ${req.params.id} chatGroup`;
  },
};

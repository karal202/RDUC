//service: xử lý logic nghiệp vụ, tương tác với database, sau đó trả về kết quả cho controller
import sequelize from "../common/squelize/connect.sequelize.js";

//body: gửi đoạn json lên server
//header: user token, accept, method,...
//params

export const articleService = {
  async findAll(req) {
    let { page, pageSize, filters } = req.query;
    
    const pageDefault = 1;
    const pageSizeDefault = 10;
    
    page = Number(page) || pageDefault;
    pageSize = Number(pageSize) || pageSizeDefault;
    
    if (page < 1) page = pageDefault;
    if (pageSize < 1) pageSize = pageSizeDefault;
    
    try {
      filters = JSON.parse(filters);
    } catch (err) {
      filters = {};
    }
    
    // TODO: Implement with Sequelize article model when available
    return {
      items: [],
      totalItems: 0,
      totalPages: 0,
      page: page,
      pageSize: pageSize,
    };
  },

  async findOne(req) {
    // TODO: Implement with Sequelize article model when available
    return null;
  },

  async create(req) {
    // TODO: Implement with Sequelize article model when available
    return true;
  },

  async update(req) {
    // TODO: Implement with Sequelize article model when available
    return true;
  },

  async delete(req) {
    // TODO: Implement with Sequelize article model when available
    return true;
  },
};

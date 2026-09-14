export const chatMessageService = {
  async create(req) {
    return `This action create`;
  },

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
    
    // TODO: Replace with actual Sequelize model when available
    return {
      items: [],
      totalItems: 0,
      totalPages: 0,
      page: page,
      pageSize: pageSize,
    };
  },

  async findOne(req) {
    return `This action returns a id: ${req.params.id} chatMessage`;
  },

  async update(req) {
    return `This action updates a id: ${req.params.id} chatMessage`;
  },

  async remove(req) {
    return `This action removes a id: ${req.params.id} chatMessage`;
  },
};

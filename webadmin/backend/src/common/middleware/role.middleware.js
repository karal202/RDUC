import { ForbiddenError, UnauthorizedError } from "../helpers/exception.helper.js";

/**
 * Middleware kiểm tra quyền truy cập dựa trên role của user đã xác thực
 * @param  {...string} allowedRoles - Danh sách các role được phép truy cập (vd: 'admin', 'super_admin')
 */
export const requireRole = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      throw new UnauthorizedError("Vui lòng đăng nhập để tiếp tục");
    }

    const userRole = req.user.role;
    if (!userRole || (!allowedRoles.includes(userRole) && !allowedRoles.includes("*"))) {
      throw new ForbiddenError("Bạn không có quyền thực hiện thao tác này");
    }

    next();
  };
};

export const requireAdmin = requireRole("admin", "super_admin");
export const requireSuperAdmin = requireRole("super_admin");

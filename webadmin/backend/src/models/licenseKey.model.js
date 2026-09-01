import { DataTypes } from "sequelize";
import sequelize from "../common/squelize/connect.sequelize.js";
import Admin from "./admin.model.js";

const LicenseKey = sequelize.define(
  "LicenseKey",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    key_code: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    customer_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    customer_contact: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    max_devices: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    status: {
      type: DataTypes.ENUM("active", "disabled", "expired", "revoked"),
      defaultValue: "active",
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    note: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    bound_ip_address: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "IP công khai duy nhất được phép dùng key này (null = chưa kích hoạt lần nào)",
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "license_keys",
    timestamps: false,
  },
);

LicenseKey.belongsTo(Admin, {
  foreignKey: "created_by",
  as: "creator",
});

export default LicenseKey;

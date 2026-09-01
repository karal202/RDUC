import { DataTypes } from "sequelize";
import sequelize from "../common/squelize/connect.sequelize.js";

const BlockedIp = sequelize.define(
  "BlockedIp",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: true,
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    blocked_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    blocked_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "blocked_ips",
    timestamps: false,
  },
);

export default BlockedIp;

import { DataTypes } from "sequelize";
import sequelize from "../common/squelize/connect.sequelize.js";

const Device = sequelize.define(
  "Device",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    device_hash: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
    },
    device_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    os_info: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    first_seen: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    last_seen: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "devices",
    timestamps: false,
  },
);

export default Device;

import { DataTypes } from "sequelize";
import sequelize from "../common/squelize/connect.sequelize.js";

const BlockedHardware = sequelize.define(
  "BlockedHardware",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    hardware_id: {
      type: DataTypes.STRING(255),
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
  },
  {
    tableName: "blocked_hardware",
    timestamps: false,
  },
);

export default BlockedHardware;

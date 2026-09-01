import { DataTypes } from "sequelize";
import sequelize from "../common/squelize/connect.sequelize.js";

const ActivationLog = sequelize.define(
  "ActivationLog",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    key_code: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    device_hash: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    result: {
      type: DataTypes.ENUM(
        "success",
        "invalid_key",
        "expired",
        "device_limit",
        "disabled",
        "revoked",
        "ip_mismatch"
      ),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "activation_logs",
    timestamps: false,
  },
);

export default ActivationLog;

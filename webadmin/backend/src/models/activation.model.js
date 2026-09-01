import { DataTypes } from "sequelize";
import sequelize from "../common/squelize/connect.sequelize.js";
import LicenseKey from "./licenseKey.model.js";

const Activation = sequelize.define(
  "Activation",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    license_key_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    hardware_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    device_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    activated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    last_seen_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "activations",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["license_key_id", "hardware_id"],
      },
    ],
  },
);

Activation.belongsTo(LicenseKey, {
  foreignKey: "license_key_id",
  as: "licenseKey",
});

export default Activation;

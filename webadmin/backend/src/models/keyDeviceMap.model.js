import { DataTypes } from "sequelize";
import sequelize from "../common/squelize/connect.sequelize.js";
import LicenseKey from "./licenseKey.model.js";
import Device from "./device.model.js";

const KeyDeviceMap = sequelize.define(
  "KeyDeviceMap",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    key_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    device_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    activated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "key_device_map",
    timestamps: false,
  },
);

KeyDeviceMap.belongsTo(LicenseKey, {
  foreignKey: "key_id",
  as: "licenseKey",
});

KeyDeviceMap.belongsTo(Device, {
  foreignKey: "device_id",
  as: "device",
});

LicenseKey.hasMany(KeyDeviceMap, {
  foreignKey: "key_id",
  as: "deviceMaps",
});

export default KeyDeviceMap;

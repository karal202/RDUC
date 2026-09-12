import { DataTypes } from "sequelize";
import sequelize from "../common/squelize/connect.sequelize.js";

const FeatureAuditLog = sequelize.define(
  "FeatureAuditLog",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    action: { 
      type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE', 'ENABLE', 'DISABLE'), 
      allowNull: false 
    },
    entity_type: { 
      type: DataTypes.ENUM('FEATURE', 'PROFILE'), 
      allowNull: false 
    },
    entity_key: { type: DataTypes.STRING(100), allowNull: false },
    old_value: { type: DataTypes.JSON, allowNull: true },
    new_value: { type: DataTypes.JSON, allowNull: true },
    changed_by: { type: DataTypes.INTEGER, allowNull: false },
    changed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
  },
  { 
    tableName: "feature_audit_log", 
    timestamps: false,
    indexes: [
      { fields: ['entity_type', 'entity_key'] },
      { fields: ['changed_by'] },
      { fields: ['changed_at'] }
    ]
  },
);

export default FeatureAuditLog;

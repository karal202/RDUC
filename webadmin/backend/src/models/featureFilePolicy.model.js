import { DataTypes } from "sequelize";
import sequelize from "../common/squelize/connect.sequelize.js";

const FeatureFilePolicy = sequelize.define(
  "FeatureFilePolicy",
  {
    feature_key: { type: DataTypes.STRING(100), primaryKey: true },
    section: { type: DataTypes.STRING(100), allowNull: false, defaultValue: "General" },
    file_path: { type: DataTypes.STRING(500), allowNull: false },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { tableName: "feature_file_policies", timestamps: false },
);

export default FeatureFilePolicy;

import { DataTypes } from "sequelize";
import sequelize from "../common/squelize/connect.sequelize.js";

const FeatureFilePolicy = sequelize.define(
  "FeatureFilePolicy",
  {
    feature_key: { type: DataTypes.STRING(100), primaryKey: true },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { tableName: "feature_file_policies", timestamps: false },
);

export default FeatureFilePolicy;

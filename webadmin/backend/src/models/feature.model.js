import { DataTypes } from "sequelize";
import sequelize from "../common/squelize/connect.sequelize.js";

const Feature = sequelize.define(
  "Feature",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    feature_key: { 
      type: DataTypes.STRING(100), 
      allowNull: false, 
      unique: true,
      validate: {
        is: /^[a-z0-9-]+$/, // kebab-case, alphanumeric only
        msg: "Feature key must be kebab-case (lowercase, numbers, hyphens only)"
      }
    },
    feature_name: { type: DataTypes.STRING(200), allowNull: false },
    section: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { 
    tableName: "features", 
    timestamps: false,
    indexes: [
      { fields: ['section'] },
      { fields: ['feature_key'] }
    ]
  },
);

export default Feature;

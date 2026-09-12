import { DataTypes } from "sequelize";
import sequelize from "../common/squelize/connect.sequelize.js";

const FeatureProfile = sequelize.define(
  "FeatureProfile",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    feature_key: { 
      type: DataTypes.STRING(100), 
      allowNull: false,
      validate: {
        is: /^[a-z0-9-]+$/,
        msg: "Feature key must be kebab-case"
      }
    },
    profile_key: { 
      type: DataTypes.STRING(100), 
      allowNull: false,
      validate: {
        is: /^[a-z0-9-]+$/,
        msg: "Profile key must be kebab-case"
      }
    },
    profile_name: { type: DataTypes.STRING(200), allowNull: false },
    file_path: { 
      type: DataTypes.STRING(500), 
      allowNull: false,
      validate: {
        notEmpty: { msg: "File path cannot be empty" }
      }
    },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { 
    tableName: "feature_profiles", 
    timestamps: false,
    indexes: [
      { fields: ['feature_key'] },
      { fields: ['enabled'] },
      { unique: true, fields: ['feature_key', 'profile_key'], name: 'uk_feature_profile' }
    ]
  },
);

export default FeatureProfile;

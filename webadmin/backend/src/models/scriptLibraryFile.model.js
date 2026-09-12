import { DataTypes } from "sequelize";
import sequelize from "../common/squelize/connect.sequelize.js";

const ScriptLibraryFile = sequelize.define(
  "ScriptLibraryFile",
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    original_name: { type: DataTypes.STRING(255), allowNull: false },
    storage_name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    relative_path: { type: DataTypes.STRING(500), allowNull: false, unique: true },
    mime_type: { type: DataTypes.STRING(100), allowNull: true },
    size: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    sha256: { type: DataTypes.STRING(64), allowNull: false },
    status: { type: DataTypes.ENUM("draft"), allowNull: false, defaultValue: "draft" },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: "script_library_files", updatedAt: false, createdAt: "created_at" },
);

export default ScriptLibraryFile;

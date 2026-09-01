import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const dbHost = process.env.DB_HOST || "localhost";
const dbPort = process.env.DB_PORT || 3306;
const dbUser = process.env.DB_USER || "root";
const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "";
const dbName = process.env.DB_NAME || "license_system";

const databaseUrl =
  process.env.DB_URL || `mysql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

const sequelize = new Sequelize(databaseUrl, {
  logging: false,
  dialectOptions: {
    charset: "utf8mb4",
    timezone: "+07:00",
  },
});

try {
  await sequelize.authenticate();
  console.log("[SEQUELIZE] Connection has been established successfully.");

  // Auto-add missing columns and drop legacy columns to avoid insert failures
  try {
    await sequelize.query("ALTER TABLE license_keys ADD COLUMN customer_name VARCHAR(100) NULL");
  } catch (e) {}
  try {
    await sequelize.query("ALTER TABLE license_keys ADD COLUMN customer_contact VARCHAR(100) NULL");
  } catch (e) {}

  // Ensure key_code is large enough for AES-256-CBC cipher output (~100 chars)
  try {
    await sequelize.query("ALTER TABLE license_keys MODIFY COLUMN key_code VARCHAR(255) NOT NULL");
  } catch (e) {}

  // Drop any foreign key constraint attached to product_id, then drop legacy column
  try {
    const [fkRows] = await sequelize.query(
      "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'license_keys' AND COLUMN_NAME = 'product_id' AND REFERENCED_TABLE_NAME IS NOT NULL",
    );
    for (const fk of fkRows || []) {
      const name = fk.CONSTRAINT_NAME || fk.constraint_name;
      if (name) {
        try { await sequelize.query(`ALTER TABLE license_keys DROP FOREIGN KEY \`${name}\``); } catch (_) {}
      }
    }
  } catch (e) {}
  try {
    await sequelize.query("ALTER TABLE license_keys DROP COLUMN product_id");
    console.log("[SEQUELIZE] Dropped legacy 'license_keys.product_id' column.");
  } catch (e) {}

  try {
    await sequelize.query(
      "ALTER TABLE license_keys ADD COLUMN bound_ip_address VARCHAR(45) NULL COMMENT 'IP cong khai duy nhat duoc phep dung key nay (null = chua kich hoat lan nao)'",
    );
    console.log("[SEQUELIZE] Added 'license_keys.bound_ip_address' column.");
  } catch (e) {}

  try {
    await sequelize.query(
      "ALTER TABLE activation_logs MODIFY COLUMN result ENUM('success','invalid_key','expired','device_limit','disabled','revoked','ip_mismatch') NOT NULL",
    );
    console.log("[SEQUELIZE] Extended activation_logs.result ENUM with 'revoked' and 'ip_mismatch'.");
  } catch (e) {}

  await sequelize.sync({ alter: true, force: false });
  console.log("[SEQUELIZE] Models synchronized successfully.");
} catch (error) {
  console.error("[SEQUELIZE] Unable to connect to the database:", error.message);
  console.warn(
    "[SEQUELIZE] Please check your database connection or set DB_URL in .env.",
  );
}

export default sequelize;

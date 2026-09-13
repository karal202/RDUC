import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const dbHost = process.env.DB_HOST || "localhost";
const dbPort = Number(process.env.DB_PORT || 3306);
const dbUser = process.env.DB_USER || "root";
const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "";
const dbName = process.env.DB_NAME || "license_system";

if (isProduction && !process.env.DB_PASSWORD && !process.env.DB_URL) {
  throw new Error(
    "[SECURITY FATAL] Production environment detected with empty database credentials in db.js pool. Please set DB_PASSWORD or DB_URL.",
  );
}

const dbConfig = {
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

export const pool = mysql.createPool(dbConfig);

export async function getDatabaseStatus() {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    return { ok: true, data: rows[0] };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

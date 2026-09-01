import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "license_system",
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

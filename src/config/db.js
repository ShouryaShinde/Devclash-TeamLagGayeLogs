import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Resolve .env relative to this file's location (src/config/db.js → ../../.env)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "briefly_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Initialize the database — creates the DB and all tables if they don't exist.
 * Called once on server startup.
 */
export async function initDatabase() {
  // First, connect without specifying a database to create it if needed
  const tempPool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    waitForConnections: true,
    connectionLimit: 2,
  });

  try {
    const dbName = process.env.DB_NAME || "briefly_db";
    await tempPool.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ Database "${dbName}" is ready.`);
  } catch (err) {
    console.error("❌ Failed to create database:", err.message);
    throw err;
  } finally {
    await tempPool.end();
  }

  // Create users table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Users table is ready.");
  } catch (err) {
    console.error("❌ Failed to create users table:", err.message);
    throw err;
  }

  // Create meetings table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500),
        transcript LONGTEXT,
        summary TEXT,
        key_decisions JSON,
        action_items JSON,
        duration VARCHAR(50),
        status ENUM('processing','completed','failed') DEFAULT 'processing',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ Meetings table is ready.");
  } catch (err) {
    console.error("❌ Failed to create meetings table:", err.message);
    throw err;
  }
}

export default pool;

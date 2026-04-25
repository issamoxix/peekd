import Database from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const db: BetterSqlite3.Database = new Database(join(__dirname, "../../data.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize schema
const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);

export default db;

// Helper to get current ISO timestamp
export function now(): string {
  return new Date().toISOString();
}

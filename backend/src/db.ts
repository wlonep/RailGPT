import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// SQLite Database instance
let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;
  db = await open({
    filename: path.join(__dirname, '..', 'railgpt.db'),
    driver: sqlite3.Database
  });
  // JSON 컬럼 등 호환을 위해 추가 설정
  await db.exec('PRAGMA foreign_keys = ON');
  return db;
}

export async function testConnection() {
  try {
    await getDb();
    console.log('✅ SQLite Database Connected Successfully! (railgpt.db)');
  } catch (error) {
    console.error('❌ SQLite Database Connection Failed:', error);
  }
}

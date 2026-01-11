import Database from 'better-sqlite3';
import { DB_PATH } from '$env/static/private';

const db = new Database(DB_PATH || 'blog.db');

// 基本的なテーブル作成
db.exec(`
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    nickname TEXT,
    email TEXT,
    avatar_url TEXT,
    is_email_verified INTEGER DEFAULT 0,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_protected INTEGER DEFAULT 0,
    notification_enabled INTEGER DEFAULT 1 -- 1: ON, 0: OFF
  );

  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS post (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    raw_json TEXT,
    author_id TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'public',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (author_id) REFERENCES user(id)
  );

  CREATE TABLE IF NOT EXISTS comment (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author_id TEXT,
    parent_id TEXT, -- リプライ用
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comment(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notification (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'reply' など
    content TEXT NOT NULL,
    link TEXT,
    is_read INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS analytics (
    date TEXT PRIMARY KEY,
    hits INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0
  );
`);

/**
 * マイグレーション
 */
function addColumnIfNotExists(table: string, column: string, definition: string) {
	const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
	const exists = info.some((col) => col.name === column);
	if (!exists) {
		db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
	}
}

addColumnIfNotExists('comment', 'parent_id', 'TEXT');
addColumnIfNotExists('user', 'notification_enabled', 'INTEGER DEFAULT 1');

export default db;

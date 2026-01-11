import Database from 'better-sqlite3';
import { DB_PATH } from '$env/static/private';

const db = new Database(DB_PATH || 'blog.db');

// 基本的なテーブル作成
db.exec(`
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    nickname TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_protected INTEGER DEFAULT 0
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
    author_id TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'public',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (author_id) REFERENCES user(id)
  );

  CREATE TABLE IF NOT EXISTS comment (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author_id TEXT, -- NULL を許容 (匿名用)
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES user(id) ON DELETE CASCADE
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

  CREATE TABLE IF NOT EXISTS email_verification_token (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
  );
`);

/**
 * カラム追加用
 */
function addColumnIfNotExists(table: string, column: string, definition: string) {
	const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
	const exists = info.some((col) => col.name === column);
	if (!exists) {
		db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
	}
}

/**
 * commentテーブルのauthor_id制約を外すための特別なマイグレーション
 */
function fixCommentTableConstraints() {
	const info = db.prepare(`PRAGMA table_info(comment)`).all() as any[];
	const authorIdCol = info.find(col => col.name === 'author_id');
	
	// notnull が 1 (true) の場合は制約を外す必要がある
	if (authorIdCol && authorIdCol.notnull === 1) {
		console.log("[DB Migration] Recreating comment table to allow NULL author_id");
		db.transaction(() => {
			db.exec(`
				CREATE TABLE comment_new (
					id TEXT PRIMARY KEY,
					post_id TEXT NOT NULL,
					author_id TEXT,
					content TEXT NOT NULL,
					created_at INTEGER NOT NULL,
					FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
					FOREIGN KEY (author_id) REFERENCES user(id) ON DELETE CASCADE
				);
				INSERT INTO comment_new SELECT * FROM comment;
				DROP TABLE comment;
				ALTER TABLE comment_new RENAME TO comment;
			`);
		})();
	}
}

fixCommentTableConstraints();
addColumnIfNotExists('user', 'email', 'TEXT');
addColumnIfNotExists('user', 'avatar_url', 'TEXT');
addColumnIfNotExists('user', 'is_email_verified', 'INTEGER DEFAULT 0');
addColumnIfNotExists('post', 'visibility', "TEXT NOT NULL DEFAULT 'public'");
addColumnIfNotExists('post', 'summary', 'TEXT');
addColumnIfNotExists('post', 'raw_json', 'TEXT');

const initialSettings = [
	["site_title", "PSANBLOG"],
	["is_site_public", "true"],
	["allow_signup", "true"],
	["allow_comments", "true"],
	["allow_anonymous_comments", "false"],
	["allow_account_deletion", "true"],
	["anonymous_name", "Anonymous"],
	["require_email_verification", "false"],
	["enable_turnstile", "false"],
	["home_hero_content", JSON.stringify({ blocks: [{ type: "header", data: { text: "CREATE BETTER CONTENT.", level: 1 } }] })],
	["about_page_content", JSON.stringify({ blocks: [] })],
	["error_404_content", JSON.stringify({ blocks: [{ type: "header", data: { text: "404 Not Found", level: 2 } }] })],
	["error_500_content", JSON.stringify({ blocks: [{ type: "header", data: { text: "500 Server Error", level: 2 } }] })],
	["accent_color", "#00CC99"],
	["is_setup_completed", "false"]
];

const insertSetting = db.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)");
initialSettings.forEach(([k, v]) => insertSetting.run(k, v));

export default db;
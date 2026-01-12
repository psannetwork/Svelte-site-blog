import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

let _db: Database.Database | null = null;

function initDb() {
	if (_db) return _db;

	const dbPath = process.env.DB_PATH || 'blog.db';
	const dbDir = dirname(dbPath);

	if (dbDir !== '.' && !existsSync(dbDir)) {
		try {
			mkdirSync(dbDir, { recursive: true });
			console.log(`Created database directory: ${dbDir}`);
		} catch (e) {
			console.error(`Failed to create database directory: ${dbDir}`, e);
		}
	}

	const db = new Database(dbPath);
	db.pragma('journal_mode = WAL');

	// スキーマ初期化
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
			author_id TEXT,
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

		CREATE TABLE IF NOT EXISTS notification (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			type TEXT NOT NULL,
			content TEXT NOT NULL,
			link TEXT,
			is_read INTEGER DEFAULT 0,
			created_at INTEGER NOT NULL,
			FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
		);
	`);

	// カラム追加などのマイグレーション
	const addColumn = (table: string, column: string, definition: string) => {
		const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
		if (!info.some(col => col.name === column)) {
			db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
		}
	};

	addColumn('user', 'email', 'TEXT');
	addColumn('user', 'avatar_url', 'TEXT');
	addColumn('user', 'is_email_verified', 'INTEGER DEFAULT 0');
	addColumn('user', 'notification_enabled', 'INTEGER DEFAULT 1');
	addColumn('post', 'visibility', "TEXT NOT NULL DEFAULT 'public'");
	addColumn('post', 'summary', 'TEXT');
	addColumn('post', 'raw_json', 'TEXT');

	const initialSettings = [
		["site_title", "PSANBLOG"],
		["is_site_public", "true"],
		["allow_signup", "true"],
		["allow_comments", "true"],
		["allow_anonymous_comments", "false"],
		["anonymous_name", "Anonymous"],
		["allow_account_deletion", "true"],
		["require_email_verification", "false"],
		["enable_turnstile", "false"],
		["home_hero_content", JSON.stringify({ blocks: [{ type: "header", data: { text: "CREATE BETTER CONTENT.", level: 1 } }] })],
		["about_page_content", JSON.stringify({ blocks: [] })],
		["error_404_content", JSON.stringify({ blocks: [{ type: "header", data: { text: "404 Not Found", level: 2 } }] })],
		["error_500_content", JSON.stringify({ blocks: [{ type: "header", data: { text: "500 Server Error", level: 2 } }] })],
		["accent_color", "#00CC99"],
		["enable_backup", "false"],
		["backup_interval", "24"],
		["backup_keep_count", "5"],
		["last_backup_at", "0"],
		["is_setup_completed", "false"],
		["allowed_extensions", '["jpg","jpeg","png","gif","webp","svg","ico"]']
	];

	const insertSetting = db.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)");
	initialSettings.forEach(([k, v]) => insertSetting.run(k, v));

	_db = db;
	return db;
}

export default {
	get prepare() { return initDb().prepare.bind(initDb()); },
	get exec() { return initDb().exec.bind(initDb()); },
	get transaction() { return initDb().transaction.bind(initDb()); },
	get backup() { return initDb().backup.bind(initDb()); },
	get close() { return initDb().close.bind(initDb()); },
	get unsafeMode() { return initDb().unsafeMode.bind(initDb()); },
	// その他のメソッドが必要な場合はここに追加
};

// 直接 db を取得したい場合用
export const getDb = initDb;

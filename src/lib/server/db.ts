import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

// グローバルで接続を保持（開発時のホットリロード対策）
let _db: Database.Database | null = null;

/**
 * データベースを初期化または取得する
 */
function getDb(): Database.Database {
	if (_db) return _db;

	// 実行時に環境変数を取得。なければ blog.db を使う
	const dbPath = env.DB_PATH || 'blog.db';
	const dbDir = dirname(dbPath);

	// サーバー起動後の最初のアクセス時にディレクトリを作る
	if (dbDir !== '.' && !existsSync(dbDir)) {
		try {
			mkdirSync(dbDir, { recursive: true });
			console.log(`[DB] Created directory: ${dbDir}`);
		} catch (e) {
			console.error(`[DB] Failed to create directory: ${dbDir}`, e);
		}
	}

	console.log(`[DB] Connecting to database at: ${dbPath}`);
	_db = new Database(dbPath);
	_db.pragma('journal_mode = WAL');

	// スキーマの初期化ロジック
	_db.exec(`
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
			date TEXT PRIMARY KEY, hits INTEGER DEFAULT 0, unique_visitors INTEGER DEFAULT 0
		);
		CREATE TABLE IF NOT EXISTS file_storage (
			id TEXT PRIMARY KEY,
			filename TEXT NOT NULL,
			mime_type TEXT NOT NULL,
			size INTEGER NOT NULL,
			data BLOB,
			path TEXT,
			storage_type TEXT NOT NULL, -- 'local' or 'database'
			created_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS pages (
			id TEXT PRIMARY KEY, -- 'home', 'about', or random id
			title TEXT NOT NULL,
			content TEXT NOT NULL, -- Rendered HTML
			raw_json TEXT, -- Source JSON from Editor.js
			updated_at INTEGER NOT NULL
		);
	`);

	// カラム追加マイグレーション
	const addColumn = (table: string, column: string, definition: string) => {
		const info = _db!.prepare(`PRAGMA table_info(${table})`).all() as any[];
		if (!info.some(col => col.name === column)) {
			_db!.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
		}
	};

	addColumn('user', 'email', 'TEXT');
	addColumn('user', 'avatar_url', 'TEXT');
	addColumn('post', 'raw_json', 'TEXT');
	addColumn('pages', 'raw_json', 'TEXT');

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
		["allowed_extensions", '["jpg","jpeg","png","gif","webp","svg","ico"]'],
		["storage_type", "local"]
	];

	const insertSetting = _db!.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)");
	initialSettings.forEach(([k, v]) => insertSetting.run(k, v));

	return _db;
}

/**
 * 既存のコード (db.prepare 等) を壊さないための Proxy
 */
const dbProxy = {
	get prepare() { return getDb().prepare.bind(getDb()); },
	get exec() { return getDb().exec.bind(getDb()); },
	get transaction() { return getDb().transaction.bind(getDb()); },
	get backup() { return getDb().backup.bind(getDb()); },
	get close() { return getDb().close.bind(getDb()); }
};

export default dbProxy as Database.Database;
export { getDb };
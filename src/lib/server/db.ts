import Database from 'libsql';
import { env } from '$env/dynamic/private';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

let _db: any | null = null;
let _dbStatus = {
	type: 'local',
	path: 'blog.db',
	url: ''
};

/**
 * データベースを初期化または取得する
 */
function getDb(): any {
	if (_db) return _db;

	const tursoUrl = env.TURSO_DB_URL;
	const tursoToken = env.TURSO_DB_AUTH_TOKEN;

	// TursoのURLが指定されており、かつトークンがURL形式でない（貼り付けミスのチェック）場合のみリモート接続
	if (tursoUrl && tursoUrl.startsWith('libsql') && tursoToken && !tursoToken.startsWith('libsql')) {
		// Turso リモート接続
		console.log(`[DB] Connecting to Turso: ${tursoUrl}`);
		try {
			_db = new (Database as any)(tursoUrl, { authToken: tursoToken });
			_dbStatus = { type: 'turso', path: '', url: tursoUrl };
		} catch (e) {
			console.error('[DB] Turso connection failed, falling back to local.', e);
			_db = null;
		}
	}

	if (!_db) {
		// ローカル SQLite 接続 (Tursoが未設定または失敗した場合)
		const dbPath = env.DB_PATH || 'blog.db';
		const dbDir = dirname(dbPath);

		if (dbDir !== '.' && !existsSync(dbDir)) {
			try {
				mkdirSync(dbDir, { recursive: true });
				console.log(`[DB] Created directory: ${dbDir}`);
			} catch (e) {
				console.error(`[DB] Failed to create directory: ${dbDir}`, e);
			}
		}

		console.log(`[DB] Connecting to local database at: ${dbPath}`);
		_db = new Database(dbPath);
		_dbStatus = { type: 'local', path: dbPath, url: '' };
		_db.pragma('journal_mode = WAL');
	}

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
		["storage_type", "local"],
		["site_language", "ja"]
	];

	const insertSetting = _db!.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)");
	initialSettings.forEach(([k, v]) => insertSetting.run(k, v));

	return _db;
}

/**
 * データベースの状態を取得する
 */
export function getDbStatus() {
	return _dbStatus;
}

/**
 * 既存のコード (db.prepare 等) を壊さないための Proxy
 */
const dbProxy: any = {
	prepare: (...args: any[]) => getDb().prepare(...args),
	exec: (...args: any[]) => getDb().exec(...args),
	transaction: (fn: any) => getDb().transaction(fn),
	backup: (path: string) => getDb().backup(path),
	close: () => getDb().close()
};

export default dbProxy;
export { getDb };
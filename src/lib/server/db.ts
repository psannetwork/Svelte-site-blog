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

// データベースの同期的な初期化（接続のみ）
function initializeDb(): any {
	const tursoUrl = env.TURSO_DB_URL;
	const tursoToken = env.TURSO_DB_AUTH_TOKEN;

	if (tursoUrl && tursoUrl.startsWith('libsql') && tursoToken && !tursoToken.startsWith('libsql')) {
		console.log(`[DB] Connecting to Turso: ${tursoUrl}`);
		try {
			const db = new Database(tursoUrl, { authToken: tursoToken } as any);
			_dbStatus = { type: 'turso', path: '', url: tursoUrl };
			return db;
		} catch (e) {
			console.error('[DB] Turso connection failed', e);
		}
	}

	const dbPath = env.DB_PATH || 'blog.db';
	const dbDir = dirname(dbPath);
	if (dbDir !== '.' && !existsSync(dbDir)) {
		mkdirSync(dbDir, { recursive: true });
	}
	const db = new Database(dbPath);
	_dbStatus = { type: 'local', path: dbPath, url: '' };
	db.pragma('journal_mode = WAL');

	return db;
}

// スキーマと初期データのセットアップ
function initSchema(db: any) {
	// テーブル作成ロジック
	db.exec(`
		CREATE TABLE IF NOT EXISTS user (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, nickname TEXT, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', is_protected INTEGER DEFAULT 0);
		CREATE TABLE IF NOT EXISTS session (id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, user_id TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE);
		CREATE TABLE IF NOT EXISTS post (id TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT, content TEXT NOT NULL, author_id TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'public', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY (author_id) REFERENCES user(id));
		CREATE TABLE IF NOT EXISTS comment (id TEXT PRIMARY KEY, post_id TEXT NOT NULL, author_id TEXT, content TEXT NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE, FOREIGN KEY (author_id) REFERENCES user(id) ON DELETE CASCADE);
		CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS analytics (date TEXT PRIMARY KEY, hits INTEGER DEFAULT 0, unique_visitors INTEGER DEFAULT 0);
		CREATE TABLE IF NOT EXISTS file_storage (id TEXT PRIMARY KEY, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER NOT NULL, data BLOB, path TEXT, storage_type TEXT NOT NULL, created_at INTEGER NOT NULL);
		CREATE TABLE IF NOT EXISTS pages (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, raw_json TEXT, updated_at INTEGER NOT NULL);
	`);

	// 初期設定の投入 (IGNOREにより既存データは保護される)
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

	const insertSetting = db.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)");
	for (const [k, v] of initialSettings) {
		insertSetting.run(k, v);
	}
}

// データベースのセットアップ（接続＋スキーマ初期化）
function setupDb(): any {
	const db = initializeDb();
	initSchema(db);
	return db;
}

// 初期化済みのデータベースを取得（なければ作成）
function getDb(): any {
	if (!_db) {
		_db = setupDb();
	}
	return _db;
}

// データベース接続をリセット（バックアップ復元時などに使用）
export function resetDb() {
	if (_db) {
		console.log('[DB] Closing database connection...');
		try {
			_db.close();
		} catch (e) {
			console.error('[DB] Error closing database:', e);
		}
		_db = null;
		console.log('[DB] Database connection reset.');
	}
}

export function getDbStatus() { return _dbStatus; }

// LuciaのSQLiteアダプターと互換性のあるように、prepareメソッドを適切にラップ
function createPreparedStatement(sql: string, dbInstance: any) {
	return {
		run: (...params: any[]) => {
			const stmt = dbInstance.prepare(sql);
			return stmt.run(...params);
		},
		all: (...params: any[]) => {
			const stmt = dbInstance.prepare(sql);
			return stmt.all(...params);
		},
		get: (...params: any[]) => {
			const stmt = dbInstance.prepare(sql);
			return stmt.get(...params);
		}
	};
}

// 標準の Proxy を使用して、既存の db.prepare 等の呼び出しを透過的に扱う
const dbProxy = new Proxy({}, {
	get(target, prop) {
		const instance = getDb();
		const value = instance[prop];

		if (prop === 'prepare') {
			// prepareメソッドはSQLを受け取ってPreparedStatement風のオブジェクトを返す
			return (sql: string) => createPreparedStatement(sql, instance);
		}

		if (typeof value === 'function') {
			return value.bind(instance);
		}

		return value;
	}
});

export default dbProxy as any;
export { getDb };

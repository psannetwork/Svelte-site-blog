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

function getDb(): any {
	if (_db) return _db;

	const tursoUrl = env.TURSO_DB_URL;
	const tursoToken = env.TURSO_DB_AUTH_TOKEN;

	if (tursoUrl && tursoUrl.startsWith('libsql') && tursoToken && !tursoToken.startsWith('libsql')) {
		console.log(`[DB] Connecting to Turso: ${tursoUrl}`);
		try {
			_db = new (Database as any)(tursoUrl, { authToken: tursoToken });
			_dbStatus = { type: 'turso', path: '', url: tursoUrl };
		} catch (e) {
			console.error('[DB] Turso connection failed', e);
		}
	}

	if (!_db) {
		const dbPath = env.DB_PATH || 'blog.db';
		const dbDir = dirname(dbPath);
		if (dbDir !== '.' && !existsSync(dbDir)) {
			mkdirSync(dbDir, { recursive: true });
		}
		_db = new Database(dbPath);
		_dbStatus = { type: 'local', path: dbPath, url: '' };
		_db.pragma('journal_mode = WAL');
	}

	// テーブル作成ロジック（省略せずに実行）
	_db.exec(`
		CREATE TABLE IF NOT EXISTS user (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, nickname TEXT, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', is_protected INTEGER DEFAULT 0);
		CREATE TABLE IF NOT EXISTS session (id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, user_id TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE);
		CREATE TABLE IF NOT EXISTS post (id TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT, content TEXT NOT NULL, author_id TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'public', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY (author_id) REFERENCES user(id));
		CREATE TABLE IF NOT EXISTS comment (id TEXT PRIMARY KEY, post_id TEXT NOT NULL, author_id TEXT, content TEXT NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE, FOREIGN KEY (author_id) REFERENCES user(id) ON DELETE CASCADE);
		CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS analytics (date TEXT PRIMARY KEY, hits INTEGER DEFAULT 0, unique_visitors INTEGER DEFAULT 0);
		CREATE TABLE IF NOT EXISTS file_storage (id TEXT PRIMARY KEY, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER NOT NULL, data BLOB, path TEXT, storage_type TEXT NOT NULL, created_at INTEGER NOT NULL);
		CREATE TABLE IF NOT EXISTS pages (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, raw_json TEXT, updated_at INTEGER NOT NULL);
	`);

	return _db;
}

export function getDbStatus() { return _dbStatus; }

// 標準の Proxy を使用して、既存の db.prepare 等の呼び出しを透過的に扱う
const dbProxy = new Proxy({}, {
	get(target, prop) {
		const instance = getDb();
		const value = instance[prop];
		return typeof value === 'function' ? value.bind(instance) : value;
	}
});

export default dbProxy as any;
export { getDb };

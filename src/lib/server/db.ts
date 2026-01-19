import Database from 'libsql';
import { env } from '$env/dynamic/private';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { DEFAULT_SETTINGS } from './constants';

let _db: any | null = null;
let _dbStatus = {
	type: 'local',
	path: 'blog.db',
	url: ''
};

function initializeDb(): any {
	const tursoUrl = env.TURSO_DB_URL;
	const tursoToken = env.TURSO_DB_AUTH_TOKEN;

	if (tursoUrl && (tursoUrl.startsWith('libsql') || tursoUrl.startsWith('https')) && tursoToken) {
		try {
			const db = new Database(tursoUrl, { authToken: tursoToken } as any);
			_dbStatus = { type: 'turso', path: '', url: tursoUrl };
			return db;
		} catch (e) {
			console.error('[DB] Turso failed:', e);
		}
	}

	try {
		const dbPath = env.DB_PATH || 'blog.db';
		const dbDir = dirname(dbPath);
		if (dbDir !== '.' && !existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });
		const db = new Database(dbPath);
		_dbStatus = { type: 'local', path: dbPath, url: '' };
		db.pragma('journal_mode = WAL');
		return db;
	} catch (e) {
		console.warn('[DB] Fallback to memory.');
		const db = new Database(':memory:');
		_dbStatus = { type: 'memory', path: ':memory:', url: '' };
		return db;
	}
}

function initSchema(db: any) {
	if (!db) return;
	try {
		db.exec(`
			CREATE TABLE IF NOT EXISTS user (
				id TEXT PRIMARY KEY, 
				username TEXT NOT NULL UNIQUE, 
				nickname TEXT, 
				password_hash TEXT NOT NULL, 
				role TEXT NOT NULL DEFAULT 'user', 
				is_protected INTEGER DEFAULT 0,
				avatar_url TEXT,
				notification_enabled INTEGER DEFAULT 1
			);
			CREATE TABLE IF NOT EXISTS session (id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, user_id TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE);
			CREATE TABLE IF NOT EXISTS post (id TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT, content TEXT NOT NULL, raw_json TEXT, author_id TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'public', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY (author_id) REFERENCES user(id));
			CREATE TABLE IF NOT EXISTS comment (id TEXT PRIMARY KEY, post_id TEXT NOT NULL, parent_id TEXT, author_id TEXT, content TEXT NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE, FOREIGN KEY (author_id) REFERENCES user(id) ON DELETE CASCADE);
			CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
			CREATE TABLE IF NOT EXISTS analytics (date TEXT PRIMARY KEY, hits INTEGER DEFAULT 0, unique_visitors INTEGER DEFAULT 0);
			CREATE TABLE IF NOT EXISTS file_storage (id TEXT PRIMARY KEY, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER NOT NULL, data BLOB, path TEXT, storage_type TEXT NOT NULL, created_at INTEGER NOT NULL);
			CREATE TABLE IF NOT EXISTS pages (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, raw_json TEXT, updated_at INTEGER NOT NULL);
			CREATE TABLE IF NOT EXISTS notification (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, content TEXT NOT NULL, link TEXT, is_read INTEGER DEFAULT 0, created_at INTEGER NOT NULL, FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE);
			
			CREATE INDEX IF NOT EXISTS idx_post_author ON post(author_id);
			CREATE INDEX IF NOT EXISTS idx_comment_post ON comment(post_id);
			CREATE INDEX IF NOT EXISTS idx_notification_user ON notification(user_id);
		`);

		try { db.exec("ALTER TABLE user ADD COLUMN avatar_url TEXT"); } catch (e) { }
		try { db.exec("ALTER TABLE user ADD COLUMN notification_enabled INTEGER DEFAULT 1"); } catch (e) { }
		try { db.exec("ALTER TABLE post ADD COLUMN raw_json TEXT"); } catch (e) { }
		try { db.exec("ALTER TABLE comment ADD COLUMN parent_id TEXT"); } catch (e) { }
		try {
			db.exec(`CREATE TABLE IF NOT EXISTS notification (
				id TEXT PRIMARY KEY, 
				user_id TEXT NOT NULL, 
				type TEXT NOT NULL, 
				content TEXT NOT NULL, 
				link TEXT, 
				is_read INTEGER DEFAULT 0, 
				created_at INTEGER NOT NULL, 
				FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
			)`);
			db.exec("CREATE INDEX IF NOT EXISTS idx_notification_user ON notification(user_id)");
		} catch (e) { }

		const insertSetting = db.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)");
		for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
			try {
				insertSetting.run(key, value);
			} catch (e) {
				// 個別の投入失敗はログ出力のみに留める
				console.warn(`[DB] Failed to insert default setting ${key}:`, e);
			}
		}
	} catch (e) {
		console.error('[DB] Schema error:', e);
	}
}

function setupDb(): any {
	const db = initializeDb();
	initSchema(db);
	return db;
}

function getDb(): any {
	if (!_db) _db = setupDb();
	return _db;
}

export function resetDb() {
	if (_db) {
		try { _db.close(); } catch (e) { }
		_db = null;
	}
}

export function getDbStatus() { return _dbStatus; }

function createPreparedStatement(sql: string, dbInstance: any) {
	const stmt = dbInstance.prepare(sql);
	return {
		run: (...params: any[]) => {
			const args = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
			return args.length > 0 ? stmt.run(args) : stmt.run();
		},
		all: (...params: any[]) => {
			const args = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
			const result = args.length > 0 ? stmt.all(args) : stmt.all();
			return Array.isArray(result) ? result : (result?.rows || []);
		},
		get: (...params: any[]) => {
			const args = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
			const result = args.length > 0 ? stmt.get(args) : stmt.get();
			if (result && !Array.isArray(result) && result.rows && result.rows.length > 0) {
				return result.rows[0];
			}
			return result;
		},
		_raw: stmt,
		...stmt
	};
}

const dbProxy = new Proxy({}, {
	get(target, prop) {
		const instance = getDb();
		if (!instance) return (...args: any[]) => { throw new Error("DB error"); };
		if (prop === 'prepare') return (sql: string) => createPreparedStatement(sql, instance);
		const value = instance[prop];
		return typeof value === 'function' ? value.bind(instance) : value;
	}
});

export default dbProxy as any;
export { getDb };
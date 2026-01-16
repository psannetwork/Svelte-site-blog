import Database from 'libsql';
import { env } from '$env/dynamic/private';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { DEFAULT_SETTINGS } from './settings';

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

	// Turso URL は libsql:// または https:// で始まる場合がある
	if (tursoUrl && (tursoUrl.startsWith('libsql') || tursoUrl.startsWith('https')) && tursoToken) {
		console.log(`[DB] Connecting to Turso: ${tursoUrl}`);
		try {
			const db = new Database(tursoUrl, { authToken: tursoToken } as any);
			_dbStatus = { type: 'turso', path: '', url: tursoUrl };
			return db;
		} catch (e) {
			console.error('[DB] Turso connection failed', e);
		}
	}

	try {
		const dbPath = env.DB_PATH || 'blog.db';
		const dbDir = dirname(dbPath);
		if (dbDir !== '.' && !existsSync(dbDir)) {
			mkdirSync(dbDir, { recursive: true });
		}
		const db = new Database(dbPath);
		_dbStatus = { type: 'local', path: dbPath, url: '' };
		db.pragma('journal_mode = WAL');
		return db;
	} catch (e) {
		console.error('[DB] Local SQLite connection failed', e);
		
		// 最終手段: インメモリデータベース
		console.warn('[DB] Using in-memory database as fallback. Data will NOT be persisted.');
		try {
			const db = new Database(':memory:');
			_dbStatus = { type: 'memory', path: ':memory:', url: '' };
			return db;
		} catch (memErr) {
			console.error('[DB] In-memory database also failed!', memErr);
			return null;
		}
	}
}

// スキーマと初期データのセットアップ
function initSchema(db: any) {
	if (!db) return;
	try {
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
			CREATE TABLE IF NOT EXISTS notification (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, content TEXT NOT NULL, link TEXT, is_read INTEGER DEFAULT 0, created_at INTEGER NOT NULL, FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE);
			
			-- 高速化のためのインデックス
			CREATE INDEX IF NOT EXISTS idx_post_author ON post(author_id);
			CREATE INDEX IF NOT EXISTS idx_comment_post ON comment(post_id);
			CREATE INDEX IF NOT EXISTS idx_notification_user ON notification(user_id);
		`);

		// 初期設定の投入 (IGNOREにより既存データは保護される)
		const insertSetting = db.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)");
		
		// 効率的な投入のためにトランザクションを試行
		try {
			// Proxy経由ではなく直接のメソッドがあるか確認
			const transaction = db.transaction((data: any) => {
				for (const [key, value] of Object.entries(data)) {
					insertSetting.run(key, value);
				}
			});
			transaction(DEFAULT_SETTINGS);
		} catch (err) {
			// トランザクション失敗時は逐次実行（Proxy経由のフォールバック）
			for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
				try { insertSetting.run(key, value); } catch(e) {}
			}
		}
	} catch (e) {
		console.error('[DB] Schema initialization failed', e);
	}
}

// データベースのセットアップ（接続＋スキーマ初期化）
function setupDb(): any {
	const db = initializeDb();
	if (db) {
		initSchema(db);
	}
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

// LuciaのSQLiteアダプターや既存のコードと互換性のあるように、prepareメソッドをラップ
function createPreparedStatement(sql: string, dbInstance: any) {
	const stmt = dbInstance.prepare(sql);
	
	// 各メソッドをラップして引数処理を統一
	return {
		run: (...params: any[]) => {
			const args = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
			return stmt.run(args);
		},
		all: (...params: any[]) => {
			const args = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
			const result = stmt.all(args);
			// ResultSetオブジェクトが返ってきた場合への対応
			return Array.isArray(result) ? result : (result.rows || []);
		},
		get: (...params: any[]) => {
			const args = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
			const result = stmt.get(args);
			// ResultSetの場合への対応
			if (result && !Array.isArray(result) && result.rows && result.rows.length > 0) {
				return result.rows[0];
			}
			return result;
		},
		// 内部のstmtオブジェクトへのアクセスを許可
		_raw: stmt,
		// その他必要なプロパティがあれば委譲
		...stmt
	};
}

// 標準の Proxy を使用して、既存の db.prepare 等の呼び出しを透過的に扱う
const dbProxy = new Proxy({}, {
	get(target, prop) {
		const instance = getDb();
		if (!instance) {
			return (...args: any[]) => {
				console.error(`[DB] Database not connected. Cannot execute: ${String(prop)}`);
				throw new Error("Database connection is not established.");
			};
		}

		if (prop === 'prepare') {
			return (sql: string) => createPreparedStatement(sql, instance);
		}

		const value = instance[prop];
		if (typeof value === 'function') {
			return value.bind(instance);
		}
		return value;
	}
});

export default dbProxy as any;
export { getDb };

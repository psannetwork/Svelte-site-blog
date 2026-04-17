import { mkdirSync, existsSync, readdirSync, unlinkSync, statSync, copyFileSync, renameSync } from 'fs';
import { join } from 'path';
import db, { resetDb } from './db';
import { getSetting, setSetting } from './settings';
import { env } from '$env/dynamic/private';
import Database from 'libsql';

const BACKUP_DIR = join(process.cwd(), 'backups');
const DB_PATH = env.DB_PATH || join(process.cwd(), 'blog.db');

export function isValidSqlite(buffer: Buffer): boolean {
	const header = buffer.toString('utf8', 0, 16);
	return header === 'SQLite format 3\0';
}

/**
 * データベースファイルの整合性とスキーマを検証する
 */
export function verifyDatabase(path: string): { success: boolean; error?: string } {
	try {
		if (!existsSync(path)) {
			return { success: false, error: 'ファイルが存在しません。' };
		}

		const stat = statSync(path);
		if (stat.size === 0) {
			return { success: false, error: 'ファイルが空です。' };
		}

		// 一時的なコネクションで開いてみる
		const tempDb = new Database(path);

		try {
			// 必須テーブルの存在確認 (最小限必要なものに絞る)
			const essentialTables = ['user', 'post'];
			const tables = tempDb
				.prepare("SELECT name FROM sqlite_master WHERE type='table'")
				.all() as any[];
			const tableNames = tables.map((t) =>
				(t.name || t.NAME || (typeof t === 'string' ? t : '')).toLowerCase()
			);

			const missingTables = essentialTables.filter((name) => !tableNames.includes(name));

			tempDb.close();

			if (missingTables.length > 0) {
				return {
					success: false,
					error: `不完全なデータベースです。必要なテーブルが見つかりません: ${missingTables.join(', ')}`
				};
			}

			return { success: true };
		} catch (dbError: any) {
			try {
				tempDb.close();
			} catch (e) {}
			return { success: false, error: `DBアクセスエラー: ${dbError.message}` };
		}
	} catch (e) {
		console.error('[VERIFY ERROR]', e);
		return {
			success: false,
			error: 'データベースファイルの検証に失敗しました。ファイルが壊れている可能性があります。'
		};
	}
}

export async function performBackup() {
if (env.TURSO_DB_URL) {
setSetting('last_backup_at', Date.now().toString());
return { success: true, message: 'Managed by Turso' };
}

if (!existsSync(BACKUP_DIR)) {
mkdirSync(BACKUP_DIR, { recursive: true });
}
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = join(BACKUP_DIR, `backup-${timestamp}.db`);
const tempBackupPath = join(BACKUP_DIR, `backup-${timestamp}.tmp.db`);

try {
let backupSuccess = false;

// 1. VACUUM INTO で一時的なバックアップファイルに出力 (推奨)
try {
db.prepare(`VACUUM INTO ?`).run(tempBackupPath);

// 検証後に本番ファイルに移動
const verification = verifyDatabase(tempBackupPath);
if (!verification.success) {
throw new Error(verification.error || 'Backup verification failed');
}

// 原子操作でリネーム
renameSync(tempBackupPath, backupPath);

backupSuccess = true;
} catch (vErr) {
console.warn('[BACKUP] VACUUM INTO failed, falling back to copy:', vErr);
// 一時ファイルをクリーンアップ
try { if (existsSync(tempBackupPath)) unlinkSync(tempBackupPath); } catch (e) {}
}

// 2. ドライバのバックアップ機能があるか確認 (better-sqlite3 等)
if (!backupSuccess && typeof (db as any).backup === 'function') {
try {
await (db as any).backup(tempBackupPath);

// 検証後に本番ファイルに移動
const verification = verifyDatabase(tempBackupPath);
if (!verification.success) {
throw new Error(verification.error || 'Backup verification failed');
}

renameSync(tempBackupPath, backupPath);

backupSuccess = true;
} catch (err: any) {
console.warn('[BACKUP] driver.backup failed:', err);
try { if (existsSync(tempBackupPath)) unlinkSync(tempBackupPath); } catch (e) {}
}
}

// 3. ファイルコピーによるバックアップ (最後の手段)
if (!backupSuccess && existsSync(DB_PATH)) {
// WAL モードの場合はチェックポイントを実行してデータをメインファイルに書き出す
try {
db.prepare('PRAGMA wal_checkpoint(FULL)').run();
} catch (e) {}

// 一時ファイルにコピー
copyFileSync(DB_PATH, tempBackupPath);

// 検証後に本番ファイルに移動
const verification = verifyDatabase(tempBackupPath);
if (!verification.success) {
throw new Error(verification.error || 'Backup verification failed');
}

renameSync(tempBackupPath, backupPath);

backupSuccess = true;
}

if (backupSuccess) {
setSetting('last_backup_at', Date.now().toString());
rotateBackups();
return { success: true, path: backupPath };
}

return { success: false, error: 'Backup method not available' };
} catch (e) {
console.error('[BACKUP ERROR]', e);
// 一時ファイルをクリーンアップ
try { if (existsSync(tempBackupPath)) unlinkSync(tempBackupPath); } catch (e) {}
return { success: false, error: String(e) };
}
}

	if (!existsSync(BACKUP_DIR)) {
		mkdirSync(BACKUP_DIR, { recursive: true });
	}
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backupPath = join(BACKUP_DIR, `backup-${timestamp}.db`);

	try {
		// 1. VACUUM INTO による整合性のあるバックアップ (推奨)
		try {
			db.prepare(`VACUUM INTO ?`).run(backupPath);
			setSetting('last_backup_at', Date.now().toString());
			rotateBackups();
			return { success: true, path: backupPath };
		} catch (vErr) {
			console.warn('[BACKUP] VACUUM INTO failed, falling back to copy:', vErr);
		}

		// 2. ドライバのバックアップ機能があるか確認 (better-sqlite3等)
		if (typeof (db as any).backup === 'function') {
			try {
				await (db as any).backup(backupPath);
				setSetting('last_backup_at', Date.now().toString());
				rotateBackups();
				return { success: true, path: backupPath };
			} catch (err: any) {
				console.warn('[BACKUP] driver.backup failed:', err);
			}
		}

		// 3. ファイルコピーによるバックアップ (最後の手段)
		if (existsSync(DB_PATH)) {
			// WALモードの場合はチェックポイントを実行してデータをメインファイルに書き出す
			try {
				db.prepare('PRAGMA wal_checkpoint(FULL)').run();
			} catch (e) {}

			copyFileSync(DB_PATH, backupPath);
			setSetting('last_backup_at', Date.now().toString());
			rotateBackups();
			return { success: true, path: backupPath };
		}

		return { success: false, error: 'Backup method not available' };
	} catch (e) {
		console.error('[BACKUP ERROR]', e);
		return { success: false, error: String(e) };
	}
}

export function rotateBackups() {
	const keepCount = parseInt(getSetting('backup_keep_count', '5'));
	const files = readdirSync(BACKUP_DIR)
		.filter((f) => f.endsWith('.db'))
		.map((f) => ({ name: f, time: statSync(join(BACKUP_DIR, f)).mtimeMs }))
		.sort((a, b) => b.time - a.time);
	if (files.length > keepCount) {
		files.slice(keepCount).forEach((f) => unlinkSync(join(BACKUP_DIR, f.name)));
	}
}

export function listBackups() {
	if (!existsSync(BACKUP_DIR)) return [];
	return readdirSync(BACKUP_DIR)
		.filter((f) => f.endsWith('.db'))
		.map((f) => {
			const stat = statSync(join(BACKUP_DIR, f));
			return { name: f, size: stat.size, time: stat.mtimeMs };
		})
		.sort((a, b) => b.time - a.time);
}

/**
 * データベースを復元する
 * 実行中のDBを安全に上書きするため、一時的に閉じてからファイルを差し替えます
 */
export async function restoreBackup(filename: string) {
	const backupPath = join(BACKUP_DIR, filename);
	if (!existsSync(backupPath)) return { success: false, error: 'Backup not found' };

	try {
		// 復元前に検証
		const verification = verifyDatabase(backupPath);
		if (!verification.success) {
			return verification;
		}

		resetDb();

		copyFileSync(backupPath, DB_PATH);

		return { success: true, message: 'データベースの復元が完了しました。' };
	} catch (e) {
		console.error('[RESTORE ERROR]', e);
		return { success: false, error: String(e) };
	}
}

import { mkdirSync, existsSync, readdirSync, unlinkSync, statSync, copyFileSync } from 'fs';
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
			// 必須テーブルの存在確認
			const requiredTables = ['user', 'post', 'site_settings', 'comment'];
			const tables = tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
			const tableNames = tables.map(t => t.name || t.NAME || (typeof t === 'string' ? t : ''));
			
			const missingTables = requiredTables.filter(name => !tableNames.includes(name));
			
			tempDb.close();

			if (missingTables.length > 0) {
				return { 
					success: false, 
					error: `不完全なデータベースです。不足テーブル: ${missingTables.join(', ')}` 
				};
			}

			return { success: true };
		} catch (dbError) {
			try { tempDb.close(); } catch (e) {}
			throw dbError;
		}
	} catch (e) {
		console.error('[VERIFY ERROR]', e);
		return { success: false, error: 'データベースファイルの検証に失敗しました。ファイルが壊れている可能性があります。' };
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

	try {
		// 1. ドライバのバックアップ機能があるか確認

		if (typeof (db as any).backup === 'function') {
			try {
				await (db as any).backup(backupPath);

				setSetting('last_backup_at', Date.now().toString());

				rotateBackups();

				return { success: true, path: backupPath };
			} catch (err: any) {
				if (err.message?.includes('not implemented')) {
					// 未実装の場合はファイルコピーへフォールバック
				} else {
					throw err;
				}
			}
		}

		// 2. ファイルコピーによるバックアップ (ローカルSQLiteのみ)

		if (existsSync(DB_PATH)) {
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

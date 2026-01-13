import { mkdirSync, existsSync, readdirSync, unlinkSync, statSync, copyFileSync } from 'fs';
import { join } from 'path';
import db from './db';
import { getSetting, setSetting } from './settings';
import { env } from '$env/dynamic/private';

const BACKUP_DIR = join(process.cwd(), 'backups');
const DB_PATH = env.DB_PATH || join(process.cwd(), 'blog.db');

export function isValidSqlite(buffer: Buffer): boolean {
	const header = buffer.toString('utf8', 0, 16);
	return header === 'SQLite format 3\0';
}

export function performBackup() {
	if (env.TURSO_DB_URL) {
		console.warn('[BACKUP] Skipping local backup because remote Turso database is in use.');
		return { success: false, error: 'Remote database does not support local backup.' };
	}

	if (!existsSync(BACKUP_DIR)) {
		mkdirSync(BACKUP_DIR, { recursive: true });
	}
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backupPath = join(BACKUP_DIR, `backup-${timestamp}.db`);
	try {
		// 現在のDBの内容をバックアップファイルに保存
		(db as any).backup(backupPath);
		setSetting('last_backup_at', Date.now().toString());
		rotateBackups();
		return { success: true, path: backupPath };
	} catch (e) {
		console.error('[BACKUP ERROR]', e);
		return { success: false, error: e };
	}
}

export function rotateBackups() {
	const keepCount = parseInt(getSetting('backup_keep_count', '5'));
	const files = readdirSync(BACKUP_DIR)
		.filter(f => f.endsWith('.db'))
		.map(f => ({ name: f, time: statSync(join(BACKUP_DIR, f)).mtimeMs }))
		.sort((a, b) => b.time - a.time);
	if (files.length > keepCount) {
		files.slice(keepCount).forEach(f => unlinkSync(join(BACKUP_DIR, f.name)));
	}
}

export function listBackups() {
	if (!existsSync(BACKUP_DIR)) return [];
	return readdirSync(BACKUP_DIR)
		.filter(f => f.endsWith('.db'))
		.map(f => {
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
		// 1. 現在の接続を閉じる
		if (db) {
			db.close();
		}

		// 2. ファイルを上書きコピー
		copyFileSync(backupPath, DB_PATH);

		// 3. プロセスを終了させることで、ViteやPM2などのマネージャーによる自動再起動を促す
		// これが最も確実に接続をリセットし、WALファイルなどの整合性を保つ方法です
		console.log(`[RESTORE] Database restored from ${filename}. Restarting...`);
		setTimeout(() => process.exit(0), 500);

		return { success: true };
	} catch (e) {
		console.error('[RESTORE ERROR]', e);
		return { success: false, error: e };
	}
}
import { json, error } from '@sveltejs/kit';
import db from '$lib/server/db';
import { getSetting, getSettings, setSettings } from '$lib/server/settings';
import { verifyDatabase } from '$lib/server/backup';
import { join } from 'path';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') throw error(401);

	const action = url.searchParams.get('action');
	
	if (action === 'verify') {
		const filename = url.searchParams.get('filename');
		if (!filename) throw error(400, 'Filename required');
		
		const path = join(process.cwd(), 'backups', filename);
		const result = verifyDatabase(path);
		
		// 詳細なテーブルリストを取得するために再実行（verifyDatabaseを拡張しても良いが、ここではシンプルに）
		if (result.success) {
			const Database = (await import('libsql')).default;
			const tempDb = new Database(path);
			const tables = tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
			const details = tables.map(t => t.name).filter(n => !n.startsWith('sqlite_'));
			tempDb.close();
			return json({ success: true, details });
		}
		
		return json(result);
	}

	try {
		const settings = getSettings();

		// 統計情報の取得
		const stats = {
			local: db
				.prepare("SELECT COUNT(*) as count FROM file_storage WHERE storage_type = 'local'")
				.get().count,
			database: db
				.prepare("SELECT COUNT(*) as count FROM file_storage WHERE storage_type = 'database'")
				.get().count
		};

		return json({ success: true, settings, stats });
	} catch (e) {
		throw error(500);
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') throw error(403);

	try {
		const settingsToUpdate = await request.json();
		setSettings(settingsToUpdate);
		const updatedSettings = getSettings();
		return json({ success: true, settings: updatedSettings });
	} catch (e) {
		console.error('[API SETTINGS] Save failed:', e);
		throw error(500);
	}
};

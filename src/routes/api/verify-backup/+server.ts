import { json, error } from '@sveltejs/kit';
import { verifyDatabase } from '$lib/server/backup';
import { join } from 'path';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') throw error(401);

	const filename = url.searchParams.get('filename');
	if (!filename) throw error(400, 'Filename required');
	
	const path = join(process.cwd(), 'backups', filename);
	
	try {
		const result = verifyDatabase(path);
		
		if (result.success) {
			const Database = (await import('libsql')).default;
			const tempDb = new Database(path);
			try {
				// sqlite_master からテーブル名を取得
				const tables = tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as any[];
				
				// 結果がオブジェクトの配列であることを考慮して抽出
				const details = tables.map((t: any) => {
					if (typeof t === 'string') return t;
					return t.name || t[Object.keys(t)[0]]; // fallback to first key if name is missing
				}).filter(Boolean);

				console.log('[BACKUP VERIFY] Tables found:', details);
				
				tempDb.close();
				return json({ success: true, details: details.length > 0 ? details : ['(No tables)'] });
			} catch (e) {
				tempDb.close();
				throw e;
			}
		}
		
		return json(result);
	} catch (e) {
		console.error('[BACKUP VERIFY ERROR]', e);
		return json({ success: false, error: 'Database verification failed' });
	}
};

import { json, error } from '@sveltejs/kit';
import { verifyDatabase } from '$lib/server/backup';
import { join } from 'path';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') throw error(401);

	const filename = url.searchParams.get('filename');
	if (!filename) throw error(400, 'Filename required');
	
	const path = join(process.cwd(), 'backups', filename);
	const result = verifyDatabase(path);
	
	if (result.success) {
		try {
			const Database = (await import('libsql')).default;
			const tempDb = new Database(path);
			const tables = tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
			const details = tables.map(t => t.name).filter(n => !n.startsWith('sqlite_'));
			tempDb.close();
			return json({ success: true, details });
		} catch (e) {
			console.error('[BACKUP VERIFY ERROR]', e);
			return json({ success: false, error: 'Database verification failed internal' });
		}
	}
	
	return json(result);
};

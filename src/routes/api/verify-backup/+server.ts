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
				let tableNames: string[] = [];

				// Method 1: PRAGMA table_list (Modern SQLite)
				try {
					const pragmaTables = tempDb.prepare("PRAGMA table_list").all() as any[];
					tableNames = pragmaTables
						.filter(t => t.type === 'table' && t.schema === 'main' && !t.name.startsWith('sqlite_'))
						.map(t => t.name);
				} catch (e) {
					console.log('[BACKUP VERIFY] PRAGMA table_list failed, falling back...');
				}

				// Method 2: sqlite_master (Classic fallback)
				if (tableNames.length === 0) {
					const masterTables = tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as any[];
					tableNames = masterTables.map(t => typeof t === 'string' ? t : (t.name || t.NAME || Object.values(t)[0] as string));
				}
				
				const details = tableNames.filter(Boolean);
				console.log('[BACKUP VERIFY] Raw result count:', details.length, 'Tables:', details);
				
				tempDb.close();
				// 最小限必要なテーブル（user, post等）が含まれているかもチェック
				const lowerDetails = details.map(d => d.toLowerCase());
				const hasEssentialTables = ['user', 'post'].every(t => lowerDetails.includes(t));
				
				return json({ 
					success: true, 
					details: details.length > 0 ? details : ['(No user tables found)'],
					essential: hasEssentialTables
				});
			} catch (e) {
				tempDb.close();
				console.error('[BACKUP VERIFY ERROR]', e);
				return json({ success: false, error: 'Failed to read table schema' });
			}
		}
		
		return json(result);
	} catch (e) {
		console.error('[BACKUP VERIFY ERROR]', e);
		return json({ success: false, error: 'Database verification failed' });
	}
};

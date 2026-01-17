import { json, error } from '@sveltejs/kit';
import db from '$lib/server/db';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') throw error(403);

	const { target } = await request.json();
	if (target !== 'local' && target !== 'database') throw error(400);

	const files = db.prepare("SELECT * FROM file_storage WHERE storage_type != ?").all(target) as any[];
	let current = 0;

	for (const file of files) {
		try {
			if (target === 'local') {
				// DB -> Local
				if (file.data) {
					const fullPath = join(process.cwd(), 'static', file.path);
					const dir = dirname(fullPath);
					if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
					writeFileSync(fullPath, file.data);
					db.prepare("UPDATE file_storage SET data = NULL, storage_type = 'local' WHERE id = ?").run(file.id);
				}
			} else {
				// Local -> DB
				const fullPath = join(process.cwd(), 'static', file.path);
				if (existsSync(fullPath)) {
					const buffer = readFileSync(fullPath);
					db.prepare("UPDATE file_storage SET data = ?, storage_type = 'database' WHERE id = ?").run(buffer, file.id);
					// 移行成功後、ローカルファイルを削除
					try { unlinkSync(fullPath); } catch (e) {}
				}
			}
			current++;
		} catch (e) {
			console.error(`[MIGRATION ERROR] ${file.id}:`, e);
		}
	}

	return json({ success: true, migrated: current, total: files.length });
};

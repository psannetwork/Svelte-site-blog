import { json, error } from '@sveltejs/kit';
import db from '$lib/server/db';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') throw error(403);

	const { target } = await request.json();
	if (target !== 'local' && target !== 'database') throw error(400);

	const files = db
		.prepare('SELECT * FROM file_storage WHERE storage_type != ?')
		.all(target) as any[];
	let successCount = 0;

	for (const file of files) {
		try {
			const fullPath = join(process.cwd(), 'static', file.path);
			if (target === 'local') {
				if (file.data) {
					const dir = dirname(fullPath);
					if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
					writeFileSync(fullPath, Buffer.from(file.data));
					db.prepare(
						"UPDATE file_storage SET data = NULL, storage_type = 'local' WHERE id = ?"
					).run(file.id);
					successCount++;
				}
			} else {
				if (existsSync(fullPath)) {
					const buffer = readFileSync(fullPath);
					db.prepare(
						"UPDATE file_storage SET data = ?, storage_type = 'database' WHERE id = ?"
					).run(buffer, file.id);
					try {
						unlinkSync(fullPath);
					} catch (e) {}
					successCount++;
				} else {
					// ファイルがディスクにない場合はDBのタイプだけ更新して不整合を防ぐ
					db.prepare("UPDATE file_storage SET storage_type = 'database' WHERE id = ?").run(file.id);
				}
			}
		} catch (e) {
			console.error(`[MIGRATE] Failed: ${file.id}`, e);
		}
	}

	return json({ success: true, migrated: successCount, total: files.length });
};

import { json, error } from '@sveltejs/kit';
import db from '$lib/server/db';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') throw error(403);

	const { target } = await request.json();
	if (target !== 'local' && target !== 'database') throw error(400);

	// 移行対象のファイルリストを取得
	const files = db.prepare("SELECT * FROM file_storage WHERE storage_type != ?").all(target) as any[];
	
	const total = files.length;
	let current = 0;

	// 逐次処理を行うためのストリーム的なレスポンスは難しいため、
	// ここでは一括処理しつつ、呼び出し側で進捗を管理しやすいようにします
	// (実際には大規模な移行はバックグラウンドで行うべきですが、小規模ブログなので同期的に処理します)

	for (const file of files) {
		try {
			if (target === 'local') {
				// DB -> Local
				if (file.data) {
					const fullPath = join(process.cwd(), 'static', file.path);
					const dir = dirname(fullPath);
					if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
					writeFileSync(fullPath, file.data);
					
					// DBのデータをクリア
					db.prepare("UPDATE file_storage SET data = NULL, storage_type = 'local' WHERE id = ?").run(file.id);
				}
			} else {
				// Local -> DB
				const fullPath = join(process.cwd(), 'static', file.path);
				if (existsSync(fullPath)) {
					const buffer = readFileSync(fullPath);
					db.prepare("UPDATE file_storage SET data = ?, storage_type = 'database' WHERE id = ?").run(buffer, file.id);
				}
			}
			current++;
		} catch (e) {
			console.error(`[MIGRATION ERROR] Failed to migrate file ${file.id}:`, e);
		}
	}

	return json({ success: true, migrated: current, total });
};

import { error } from '@sveltejs/kit';
import db from '$lib/server/db';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import type { RequestHandler } from './$types';

/**
 * static/uploads 内にファイルが見つからない場合に呼ばれる。
 * データベースからファイルを検索し、あれば配信すると同時にディスクにキャッシュする。
 */
export const GET: RequestHandler = async ({ params }) => {
	const relativePath = `uploads/${params.path}`;

	const file = db.prepare('SELECT * FROM file_storage WHERE path = ?').get(relativePath) as
		| {
				data: Buffer;
				mime_type: string;
				size: number;
		  }
		| undefined;

	if (!file || !file.data) {
		throw error(404, 'File not found in database');
	}

	const fullPath = join(process.cwd(), 'static', relativePath);
	try {
		const dir = dirname(fullPath);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		writeFileSync(fullPath, file.data);
	} catch (e) {
		console.warn(`[FILES] Failed to cache file: ${relativePath}`, e);
	}

	return new Response(new Uint8Array(file.data), {
		headers: {
			'Content-Type': file.mime_type,
			'Content-Length': file.size.toString(),
			'Cache-Control': 'public, max-age=31536000, immutable'
		}
	});
};

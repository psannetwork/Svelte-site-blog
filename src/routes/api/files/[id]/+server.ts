import { error } from '@sveltejs/kit';
import { getFile } from '$lib/server/files';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	// 拡張子がついている場合（.png等）を考慮してIDを抽出
	const id = params.id.split('.')[0];
	const file = getFile(id);

	if (!file) {
		console.warn(`[FILES] File not found: ${id}`);
		throw error(404, 'File not found');
	}

	if (file.storage_type === 'database' && file.data) {
		// Buffer/Uint8Array を Blob に変換して型安全に配信
		const blob = new Blob([file.data as any], { type: file.mime_type || 'image/png' });
		
		return new Response(blob, {
			headers: {
				'Content-Type': file.mime_type || 'image/png',
				'Content-Length': file.size.toString(),
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		});
	} else if (file.storage_type === 'local' && file.path) {
		// ローカル保存の場合は本来 static フォルダから直接配信されますが、
		// 万が一ここが呼ばれた場合のリダイレクトやフォールバック
		return new Response(null, {
			status: 302,
			headers: { 'Location': `/${file.path}` }
		});
	}

	throw error(404, 'File data not available');
};

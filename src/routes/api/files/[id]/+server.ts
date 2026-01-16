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
		// Buffer や Uint8Array を標準的な Response ボディとして扱う
		// .buffer を参照することで ArrayBuffer を取得し、完全に標準準拠させる
		const body = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data as any);
		
		return new Response(body, {
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

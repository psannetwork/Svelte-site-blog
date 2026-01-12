import { error } from '@sveltejs/kit';
import { getFile } from '$lib/server/files';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const file = getFile(params.id);

	if (!file) {
		throw error(404, 'File not found');
	}

	if (file.storage_type === 'database' && file.data) {
		return new Response(new Uint8Array(file.data), {
			headers: {
				'Content-Type': file.mime_type,
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

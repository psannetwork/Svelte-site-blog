import { error } from '@sveltejs/kit';
import { getFile } from '$lib/server/files';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const id = params.id.split('.')[0];
	const file = getFile(id);

	if (!file) throw error(404);

	if (file.storage_type === 'database' && file.data) {
		return new Response(file.data, {
			headers: {
				'Content-Type': file.mime_type,
				'Content-Length': file.size.toString(),
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		});
	} else if (file.storage_type === 'local' && file.path) {
		const fullPath = join(process.cwd(), 'static', file.path);
		if (existsSync(fullPath)) {
			const buffer = readFileSync(fullPath);
			return new Response(buffer, {
				headers: {
					'Content-Type': file.mime_type,
					'Content-Length': file.size.toString(),
					'Cache-Control': 'public, max-age=31536000, immutable'
				}
			});
		}
	}

	throw error(404);
};

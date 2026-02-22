import { error, json } from '@sveltejs/kit';
import { saveFile } from '$lib/server/files';
import { getSetting } from '$lib/server/settings';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'editor')) {
		throw error(401, 'Unauthorized');
	}

	const { url } = await request.json();
	if (!url) throw error(400, 'No URL provided');

	// SSRF 対策: プロトコル制限とローカルIPの拒否
	try {
		const parsedUrl = new URL(url);
		if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
			throw error(400, 'Invalid protocol');
		}

		const hostname = parsedUrl.hostname.toLowerCase();
		const blacklistedHosts = [
			'localhost',
			'127.0.0.1',
			'0.0.0.0',
			'169.254.169.254', // AWS metadata
			'::1',
			'metadata.google.internal'
		];

		if (
			blacklistedHosts.includes(hostname) ||
			hostname.startsWith('192.168.') ||
			hostname.startsWith('10.') ||
			hostname.startsWith('172.')
		) {
			throw error(400, 'Forbidden URL');
		}
	} catch (e) {
		if (e instanceof Error && (e as any).status) throw e;
		throw error(400, 'Invalid URL format');
	}

	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error('Failed to fetch image');

		const blob = await response.blob();
		const contentType = response.headers.get('content-type') || '';

		const allowedMimes = [
			'image/jpeg',
			'image/png',
			'image/gif',
			'image/webp',
			'image/svg+xml',
			'image/x-icon'
		];

		if (!allowedMimes.includes(contentType)) {
			throw error(400, `Invalid content type: ${contentType}`);
		}

		// ファイル名をURLから生成
		let filename = url.split('/').pop()?.split('?')[0] || 'fetched_image';
		if (!filename.includes('.')) {
			const extMap: Record<string, string> = {
				'image/jpeg': 'jpg',
				'image/png': 'png',
				'image/gif': 'gif',
				'image/webp': 'webp',
				'image/svg+xml': 'svg'
			};
			filename += `.${extMap[contentType] || 'jpg'}`;
		}

		const file = new File([blob], filename, { type: contentType });
		const fileInfo = await saveFile(file, 'post', locals.user.id);

		return json({
			success: 1,
			file: {
				url: fileInfo.url
			}
		});
	} catch (e) {
		console.error('[FETCH UPLOAD ERROR]', e);
		return json({ success: 0, message: 'Failed to fetch image' });
	}
};

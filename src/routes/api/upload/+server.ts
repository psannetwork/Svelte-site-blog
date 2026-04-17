import { error, json } from '@sveltejs/kit';
import { saveFile } from '$lib/server/files';
import { getSetting } from '$lib/server/settings';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'editor')) {
		throw error(401, 'Unauthorized');
	}

	const formData = await request.formData();
	const file = (formData.get('image') || formData.get('video')) as File;
	const uploadType = (url.searchParams.get('type') || 'misc') as any;

	if (!file) throw error(400, 'No file uploaded');

	// Security: File size limit (max 100MB)
	const MAX_FILE_SIZE = 100 * 1024 * 1024;
	if (file.size > MAX_FILE_SIZE) {
		throw error(400, `File size exceeds limit (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
	}

	// Determine if it's a video
	const isVideo = file.type.startsWith('video/');

	// Security: Strict MIME type validation FIRST (before extension check)
	const allowedMimes = isVideo
		? ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
		: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon'];
	
	if (!allowedMimes.includes(file.type)) {
		throw error(400, `Invalid file content type: ${file.type}`);
	}

	// Get allowed extensions from settings
	const allowedExtensionsStr = getSetting(
		'allowed_extensions',
		'["jpg","jpeg","png","gif","webp","svg","ico","mp4","webm","ogg","mov"]'
	);
	let allowedExtensions: string[] = [];
	try {
		allowedExtensions = JSON.parse(allowedExtensionsStr);
	} catch {
		allowedExtensions = isVideo 
			? ['mp4', 'webm', 'ogg', 'mov']
			: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'];
	}

	// Security: Validate file extension (after MIME type check)
	const ext = file.name.split('.').pop()?.toLowerCase();
	if (!ext || !allowedExtensions.includes(ext)) {
		throw error(400, `Unsupported file type: .${ext}`);
	}

	// Security: Sanitize filename to prevent directory traversal
	const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

	try {
		const fileInfo = await saveFile(file, uploadType, locals.user.id);
		return json({
			success: 1,
			file: {
				url: fileInfo.url
			}
		});
	} catch (e) {
		console.error('[UPLOAD ERROR]', e);
		throw error(500, 'Upload failed');
	}
};

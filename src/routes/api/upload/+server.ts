import { error, json } from '@sveltejs/kit';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { generateIdFromEntropySize } from 'lucia';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'editor')) {
		throw error(401, 'Unauthorized');
	}

	const formData = await request.formData();
	const file = formData.get('image') as File;

	if (!file) throw error(400, 'No file uploaded');

	// セキュリティ: サイズ制限 (10MB)
	if (file.size > 10 * 1024 * 1024) {
		throw error(400, 'File too large (max 10MB)');
	}

	// 拡張子チェック
	const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'svg'];
	const ext = file.name.split('.').pop()?.toLowerCase();
	if (!ext || !allowedExtensions.includes(ext)) {
		throw error(400, 'Unsupported file type');
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const fileName = `${Date.now()}-${generateIdFromEntropySize(10)}.${ext}`;
	const uploadDir = join(process.cwd(), 'static', 'uploads');

	// ディレクトリ存在確認
	if (!existsSync(uploadDir)) {
		mkdirSync(uploadDir, { recursive: true });
	}

	const filePath = join(uploadDir, fileName);

	try {
		writeFileSync(filePath, buffer);
		return json({
			success: 1,
			file: {
				url: `/uploads/${fileName}`
			}
		});
	} catch (e) {
		console.error('[UPLOAD ERROR]', e);
		throw error(500, 'Upload failed');
	}
};
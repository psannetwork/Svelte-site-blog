import { error, json } from '@sveltejs/kit';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { generateIdFromEntropySize } from 'lucia';
import { getSetting } from '$lib/server/settings'; // 追加
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'editor')) {
		throw error(401, 'Unauthorized');
	}

	const formData = await request.formData();
	const file = formData.get('image') as File;
	const uploadType = url.searchParams.get('type') || 'misc'; // 'avatar' or 'post'

	if (!file) throw error(400, 'No file uploaded');

	// 設定から許可拡張子を取得
	const allowedExtensionsStr = getSetting('allowed_extensions', '["jpg","jpeg","png","gif","webp","svg","ico"]');
	let allowedExtensions: string[] = [];
	try {
		allowedExtensions = JSON.parse(allowedExtensionsStr);
	} catch {
		allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico']; // デフォルト
	}

	const ext = file.name.split('.').pop()?.toLowerCase();
	if (!ext || !allowedExtensions.includes(ext)) {
		throw error(400, `Unsupported file type: .${ext}. Allowed: ${allowedExtensions.map(e => '.' + e).join(', ')}`);
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const fileName = `${Date.now()}-${generateIdFromEntropySize(5)}.${ext}`;
	
	// ディレクトリ分け: static/uploads/avatars/{userId} または static/uploads/posts/{userId}
	// 投稿IDはアップロード時点では確定していないことが多いため、ユーザーIDで一旦まとめます
	const subDir = uploadType === 'avatar' ? `avatars/${locals.user.id}` : `posts/${locals.user.id}`;
	const uploadDir = join(process.cwd(), 'static', 'uploads', subDir);

	if (!existsSync(uploadDir)) {
		mkdirSync(uploadDir, { recursive: true });
	}

	const filePath = join(uploadDir, fileName);

	try {
		writeFileSync(filePath, buffer);
		return json({
			success: 1,
			file: {
				url: `/uploads/${subDir}/${fileName}`
			}
		});
	} catch (e) {
		console.error('[UPLOAD ERROR]', e);
		throw error(500, 'Upload failed');
	}
};

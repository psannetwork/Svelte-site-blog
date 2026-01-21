import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !['admin', 'editor', 'author'].includes(locals.user.role)) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const { postId, title, content, rawJson, summary, thumbnailUrl, visibility } = await request.json();

	if (!postId) {
		return json({ success: false, error: 'Post ID is required' }, { status: 400 });
	}

	try {
		const now = Date.now();
		const id = crypto.randomUUID();

		// バックアップデータをデータベースに保存または更新
		const query = `
			INSERT OR REPLACE INTO post_backups (
				id, post_id, user_id, title, content, raw_json, summary, thumbnail_url, visibility, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`;

		db.prepare(query).run([
			id,
			postId,
			locals.user.id,
			title,
			content,
			rawJson,
			summary,
			thumbnailUrl,
			visibility || 'draft',
			now
		]);

		return json({ success: true });
	} catch (error) {
		console.error('Failed to save post backup:', error);
		return json({ success: false, error: 'Failed to save backup' }, { status: 500 });
	}
};
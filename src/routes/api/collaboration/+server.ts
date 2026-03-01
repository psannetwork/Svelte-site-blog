import { json, error } from '@sveltejs/kit';
import db from '$lib/server/db';
import { generateIdFromEntropySize } from 'lucia';
import type { RequestHandler } from './$types';

// 編集中ユーザー一覧取得
export const GET: RequestHandler = async ({ url }) => {
	const postId = url.searchParams.get('post');
	if (!postId) throw error(400, 'Post ID required');

	// 5 分以内のアクティビティのみ
	const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

	const collaborators = db
		.prepare(
			`
			SELECT user_id, username, last_activity, cursor_position, selection_start, selection_end
			FROM collaborations
			WHERE post_id = ? AND last_activity > ?
		`
		)
		.all(postId, fiveMinutesAgo) as any[];

	return json({ collaborators });
};

// 編集中ユーザー更新
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const { postId, cursorPosition, selectionStart, selectionEnd } = await request.json();

	if (!postId) throw error(400, 'Post ID required');

	const collaborationId = `${postId}-${locals.user.id}`;

	db.prepare(
		`
		INSERT INTO collaborations (id, post_id, user_id, username, last_activity, cursor_position, selection_start, selection_end)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			last_activity = excluded.last_activity,
			cursor_position = excluded.cursor_position,
			selection_start = excluded.selection_start,
			selection_end = excluded.selection_end
	`
	).run(
		collaborationId,
		postId,
		locals.user.id,
		locals.user.username,
		Date.now(),
		cursorPosition || 0,
		selectionStart || 0,
		selectionEnd || 0
	);

	return json({ success: true });
};

// 編集終了
export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const { postId } = await request.json();

	if (!postId) throw error(400, 'Post ID required');

	const collaborationId = `${postId}-${locals.user.id}`;

	db.prepare('DELETE FROM collaborations WHERE id = ?').run(collaborationId);

	return json({ success: true });
};

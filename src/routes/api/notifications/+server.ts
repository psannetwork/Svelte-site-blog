import { json, error } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	try {
		const notifications = db
			.prepare(
				`
			SELECT * FROM notification 
			WHERE user_id = ? 
			ORDER BY created_at DESC 
			LIMIT 50
		`
			)
			.all(locals.user.id) as any[];

		return json({ success: true, notifications });
	} catch (e) {
		return json({ success: false, error: String(e) }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	try {
		db.prepare('UPDATE notification SET is_read = 1 WHERE user_id = ?').run(locals.user.id);
		return json({ success: true });
	} catch (e) {
		return json({ success: false }, { status: 500 });
	}
};

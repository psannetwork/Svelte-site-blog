import { json, error } from '@sveltejs/kit';

export const POST = async ({ request, cookies, locals }) => {
	// 管理者、編集者、または著者のみ許可
	if (!locals.user || !['admin', 'editor', 'author'].includes(locals.user.role)) {
		throw error(401, 'Unauthorized');
	}

	const { session } = await request.json();
	if (session) {
		cookies.set('auth_session', session, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production'
		});
		return json({ success: true });
	}

	return json({ success: false, message: 'Session ID required' }, { status: 400 });
};

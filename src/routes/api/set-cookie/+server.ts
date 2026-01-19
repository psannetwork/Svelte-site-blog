import { json } from '@sveltejs/kit';

export const GET = async ({ url, cookies }) => {
	const session = url.searchParams.get('session');
	if (session) {
		cookies.set('auth_session', session, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false // localhost なので false
		});
	}
	return json({ success: true });
};

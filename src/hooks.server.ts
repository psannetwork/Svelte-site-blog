import { lucia } from '$lib/server/auth';
import db from '$lib/server/db';
import { getSetting } from '$lib/server/settings';
import { performBackup } from '$lib/server/backup';
import { redirect, type Handle } from '@sveltejs/kit';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

try {
	const envPath = join(process.cwd(), '.env');
	if (!existsSync(envPath)) {
		const defaultEnv = `DB_PATH=blog.db
# Security (Cloudflare Turnstile) - Optional
# TURNSTILE_SITE_KEY=
# TURNSTILE_SECRET_KEY=
# Created automatically by Svelte Site Blog
`;
		writeFileSync(envPath, defaultEnv);
	}
} catch (e) {
	console.warn(
		'⚠️ Could not create .env file automatically (using defaults/environment variables).'
	);
}

export const handle: Handle = async ({ event, resolve }) => {
	// 簡易的な CSRF 対策 (svelte.config.js で checkOrigin: false にしているための補填)
	if (event.request.method !== 'GET') {
		const origin = event.request.headers.get('origin');
		const host = event.request.headers.get('host');
		if (origin && host) {
			const originUrl = new URL(origin);
			if (originUrl.host !== host) {
				return new Response('CSRF Forbidden', { status: 403 });
			}
		}
	}

	// バックアップ自動実行 (ランダムに 1/10 の確率でチェック)
	if (Math.random() < 0.1 && getSetting('enable_backup') === 'true') {
		const interval = parseInt(getSetting('backup_interval', '24')) * 60 * 60 * 1000;
		const lastBackup = parseInt(getSetting('last_backup_at', '0'));
		if (Date.now() - lastBackup > interval) {
			performBackup();
		}
	}

	const isSetupCompleted = getSetting('is_setup_completed', 'false') === 'true';
	if (
		!isSetupCompleted &&
		!event.url.pathname.startsWith('/setup') &&
		!event.url.pathname.startsWith('/api')
	) {
		throw redirect(302, '/setup');
	}

	const sessionId = event.cookies.get(lucia.sessionCookieName);
	let user = null;
	let session = null;

	if (sessionId) {
		const result = await lucia.validateSession(sessionId);
		user = result.user;
		session = result.session;

		if (session && session.fresh) {
			const sessionCookie = lucia.createSessionCookie(session.id);
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '/',
				...sessionCookie.attributes
			});
		}
		if (!session) {
			const sessionCookie = lucia.createBlankSessionCookie();
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '/',
				...sessionCookie.attributes
			});
		}
	}

	event.locals.user = user;
	event.locals.session = session;

	if (
		!event.url.pathname.startsWith('/api') &&
		!event.url.pathname.startsWith('/dashboard') &&
		!event.url.pathname.startsWith('/uploads')
	) {
		const today = new Date().toISOString().split('T')[0];
		const isNewVisit = !event.cookies.get('visited_today');
		const visitorIncr = isNewVisit ? 1 : 0;

		try {
			db.prepare(
				`
				INSERT INTO analytics (date, hits, unique_visitors)
				VALUES (?, 1, ?)
				ON CONFLICT(date) DO UPDATE SET
					hits = hits + 1,
					unique_visitors = unique_visitors + ?
			`
			).run(today, visitorIncr, visitorIncr);

			if (isNewVisit) {
				event.cookies.set('visited_today', 'true', {
					path: '/',
					maxAge: 60 * 60 * 24,
					httpOnly: true
				});
			}
		} catch (e) {
			console.error('[ANALYTICS ERROR]', e);
		}
	}

	const isSitePublic = getSetting('is_site_public', 'true') === 'true';
	const isAuthPage = event.url.pathname.startsWith('/auth');
	const isSetupPage = event.url.pathname.startsWith('/setup');

	if (!isSitePublic && !user && !isAuthPage && !isSetupPage) {
		throw redirect(302, '/auth/login');
	}

	const response = await resolve(event);

	// セキュリティヘッダーの設定
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');

	// HSTS (HTTPS 強制) - 本番環境でのみ推奨
	if (process.env.NODE_ENV === 'production') {
		response.headers.set(
			'Strict-Transport-Security',
			'max-age=31536000; includeSubDomains; preload'
		);
	}

	// 簡易的な CSP (Content Security Policy)
	const csp = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://challenges.cloudflare.com https://static.cloudflareinsights.com",
		"script-src-elem 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
		"worker-src 'self' blob:",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com",
		"img-src 'self' data: blob: *",
		"frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com https://player.vimeo.com",
		"connect-src 'self' blob: https://challenges.cloudflare.com"
	].join('; ');

	response.headers.set('Content-Security-Policy', csp);

	return response;
};

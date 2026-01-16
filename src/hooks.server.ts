import { lucia } from "$lib/server/auth";
import db from "$lib/server/db";
import { getSetting } from "$lib/server/settings";
import { performBackup } from "$lib/server/backup";
import { redirect, type Handle } from "@sveltejs/kit";
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

// .envが存在しない場合に自動作成（開発環境や初回セットアップの利便性のため）
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
		console.log('✅ Created .env file with default settings.');
	}
} catch (e) {
	// 書き込み権限がない場合などは無視（Docker環境などでは環境変数で制御するため）
	console.warn('⚠️ Could not create .env file automatically (using defaults/environment variables).');
}

export const handle: Handle = async ({ event, resolve }) => {
	// 自動バックアップチェック
	const enableBackup = getSetting("enable_backup") === "true";
	if (enableBackup) {
		const interval = parseInt(getSetting("backup_interval", "24")) * 60 * 60 * 1000;
		const lastBackup = parseInt(getSetting("last_backup_at", "0"));
		if (Date.now() - lastBackup > interval) {
			performBackup();
		}
	}

	const isSetupCompleted = getSetting("is_setup_completed", "false") === "true";
	if (!isSetupCompleted && !event.url.pathname.startsWith("/setup") && !event.url.pathname.startsWith("/api")) {
		throw redirect(302, "/setup");
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
			event.cookies.set(sessionCookie.name, sessionCookie.value, { path: ".", ...sessionCookie.attributes });
		}
		if (!session) {
			const sessionCookie = lucia.createBlankSessionCookie();
			event.cookies.set(sessionCookie.name, sessionCookie.value, { path: ".", ...sessionCookie.attributes });
		}
	}

	event.locals.user = user;
	event.locals.session = session;

	// アクセスカウントの記録
	if (!event.url.pathname.startsWith("/api") && !event.url.pathname.startsWith("/dashboard") && !event.url.pathname.startsWith("/uploads")) {
		const today = new Date().toISOString().split('T')[0];
		const isNewVisit = !event.cookies.get('visited_today');
		const visitorIncr = isNewVisit ? 1 : 0;
		
		try {
			// バインド引数を変数に受けて確実に渡す
			db.prepare(`
				INSERT INTO analytics (date, hits, unique_visitors) 
				VALUES (?, 1, ?) 
				ON CONFLICT(date) DO UPDATE SET 
					hits = hits + 1,
					unique_visitors = unique_visitors + ?
			`).run(today, visitorIncr, visitorIncr);

			if (isNewVisit) {
				event.cookies.set('visited_today', 'true', { path: '/', maxAge: 60 * 60 * 24, httpOnly: true });
			}
		} catch (e) {
			// 解析エラーはログ出力のみに留め、リクエスト処理は続行する
			console.error('[ANALYTICS ERROR]', e);
		}
	}

	// サイト公開設定のチェック
	const isSitePublic = getSetting("is_site_public", "true") === "true";
	const isAuthPage = event.url.pathname.startsWith("/auth");
	const isSetupPage = event.url.pathname.startsWith("/setup");

	if (!isSitePublic && !user && !isAuthPage && !isSetupPage) {
		throw redirect(302, "/auth/login");
	}

	return resolve(event);
};

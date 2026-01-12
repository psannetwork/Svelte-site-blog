import { lucia } from "$lib/server/auth";
import db from "$lib/server/db";
import { getSetting } from "$lib/server/settings";
import { performBackup } from "$lib/server/backup";
import { redirect, type Handle } from "@sveltejs/kit";

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
	if (!event.url.pathname.startsWith("/api") && !event.url.pathname.startsWith("/dashboard")) {
		const today = new Date().toISOString().split('T')[0];
		const isNewVisit = !event.cookies.get('visited_today');
		
		try {
			db.prepare(`
				INSERT INTO analytics (date, hits, unique_visitors) 
				VALUES (?, 1, ?) 
				ON CONFLICT(date) DO UPDATE SET 
					hits = hits + 1,
					unique_visitors = unique_visitors + ?
			`).run(today, isNewVisit ? 1 : 0, isNewVisit ? 1 : 0);

			if (isNewVisit) {
				event.cookies.set('visited_today', 'true', { path: '/', maxAge: 60 * 60 * 24 });
			}
		} catch (e) {
			console.error('Analytics error:', e);
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

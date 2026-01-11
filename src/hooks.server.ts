import { lucia } from "$lib/server/auth";
import { getSetting } from "$lib/server/settings";
import { redirect, type Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
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

	// サイト公開設定のチェック
	const isSitePublic = getSetting("is_site_public", "true") === "true";
	const isAuthPage = event.url.pathname.startsWith("/auth");
	const isSetupPage = event.url.pathname.startsWith("/setup");

	if (!isSitePublic && !user && !isAuthPage && !isSetupPage) {
		throw redirect(302, "/auth/login");
	}

	return resolve(event);
};

import { lucia } from "$lib/server/auth";
import { fail, redirect } from "@sveltejs/kit";
import { generateIdFromEntropySize } from "lucia";
import { hash } from "@node-rs/argon2";
import db from "$lib/server/db";
import { getSetting, verifyTurnstile } from "$lib/server/settings";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	return {
		settings: {
			allow_signup: getSetting("allow_signup", "true") === "true",
			enable_turnstile: getSetting("enable_turnstile") === "true",
			turnstile_site_key: getSetting("turnstile_site_key")
		}
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		if (getSetting("allow_signup", "true") !== "true") {
			return fail(403, { message: "現在、新規登録は受け付けておりません。" });
		}

		const formData = await request.formData();
		const username = formData.get("username");
		const password = formData.get("password");
		const turnstileToken = formData.get("cf-turnstile-response") as string;

		if (getSetting("enable_turnstile") === "true") {
			const valid = await verifyTurnstile(turnstileToken);
			if (!valid) return fail(400, { message: "認証に失敗しました。もう一度お試しください。" });
		}

		if (typeof username !== "string" || username.length < 3 || username.length > 31) {
			return fail(400, { message: "Invalid username" });
		}
		if (typeof password !== "string" || password.length < 6 || password.length > 255) {
			return fail(400, { message: "Invalid password" });
		}

		const passwordHash = await hash(password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});
		const userId = generateIdFromEntropySize(10);

		try {
			db.prepare("INSERT INTO user (id, username, nickname, password_hash, role) VALUES (?, ?, ?, ?, ?)").run(
				userId,
				username,
				null,
				passwordHash,
				"user"
			);

			const session = await lucia.createSession(userId, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			cookies.set(sessionCookie.name, sessionCookie.value, {
				path: ".",
				...sessionCookie.attributes
			});
		} catch (e) {
			return fail(500, { message: "Username already taken or database error" });
		}

		throw redirect(302, "/");
	}
};

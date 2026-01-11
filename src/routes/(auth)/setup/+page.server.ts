import { lucia } from "$lib/server/auth";
import db from "$lib/server/db";
import { setSetting, getSetting } from "$lib/server/settings";
import { hash } from "@node-rs/argon2";
import { fail, redirect } from "@sveltejs/kit";
import { generateIdFromEntropySize } from "lucia";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	if (getSetting("is_setup_completed") === "true") throw redirect(302, "/");
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get("username") as string;
		const password = formData.get("password") as string;

		if (!username || !password || password.length < 8) {
			return fail(400, { message: "ユーザー名と8文字以上のパスワードを入力してください。" });
		}

		const passwordHash = await hash(password);
		const userId = generateIdFromEntropySize(10);

		try {
			db.prepare("INSERT INTO user (id, username, nickname, password_hash, role, is_protected) VALUES (?, ?, ?, ?, ?, ?)")
				.run(userId, username, null, passwordHash, "admin", 1);

			setSetting("is_setup_completed", "true");

			const session = await lucia.createSession(userId, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			cookies.set(sessionCookie.name, sessionCookie.value, { path: ".", ...sessionCookie.attributes });
		} catch (e) {
			return fail(500, { message: "エラーが発生しました。" });
		}

		throw redirect(302, "/dashboard");
	}
};

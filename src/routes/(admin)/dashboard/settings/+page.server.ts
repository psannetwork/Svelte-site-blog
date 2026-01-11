import { getSettings, setSetting } from "$lib/server/settings";
import { fail, redirect } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== "admin") {
		throw redirect(302, "/dashboard");
	}
	return {
		settings: getSettings()
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		
		const allKeys = [
			"site_title", "site_description", "accent_color", "is_site_public",
			"allow_signup", "allow_comments", "allow_anonymous_comments", "allow_account_deletion", "anonymous_name", "show_footer_auth", "require_email_verification",
			"home_hero_content", "about_page_content", "error_404_content", "error_500_content",
			"enable_turnstile", "turnstile_site_key", "turnstile_secret_key"
		];

		const checkboxKeys = [
			"allow_signup", "allow_comments", "allow_anonymous_comments", "allow_account_deletion",
			"show_footer_auth", "enable_turnstile", "require_email_verification"
		];

		for (const key of allKeys) {
			const val = formData.get(key);

			if (key === "is_site_public") {
				// UI上は「ログインを強制する」なので、チェックが入っていたら Public = false
				setSetting(key, val === "on" ? "false" : "true");
			} else if (checkboxKeys.includes(key)) {
				setSetting(key, val === "on" ? "true" : "false");
			} else if (val !== null) {
				setSetting(key, val.toString());
			}
		}

		return { success: true };
	}
};
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
		
		const keys = [
			"site_title", "site_description", "accent_color", "is_site_public",
			"allow_signup", "allow_comments", "show_footer_auth", "require_email_verification",
			"home_hero_content", "about_page_content", "error_404_content", "error_500_content",
			"enable_turnstile", "turnstile_site_key", "turnstile_secret_key"
		];

		for (const key of keys) {
			const val = formData.get(key);
			if (val !== null) {
				setSetting(key, val === "on" ? "true" : (val === "off" ? "false" : val.toString()));
			} else if (["allow_signup", "allow_comments", "show_footer_auth", "enable_turnstile", "require_email_verification", "is_site_public"].includes(key)) {
				setSetting(key, "false");
			}
		}

		return { success: true };
	}
};
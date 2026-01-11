import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, "/auth/login");
	}
	
	// エディター以上の権限が必要な場合はここでチェック
	if (locals.user.role !== 'admin' && locals.user.role !== 'editor') {
		throw redirect(302, "/");
	}

	return {
		user: locals.user
	};
};

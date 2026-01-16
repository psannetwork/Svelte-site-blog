import { json, error } from '@sveltejs/kit';
import { getSettings } from '$lib/server/settings';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	// 管理者以外には見せないガード
	if (!locals.user || locals.user.role !== 'admin') {
		throw error(403, 'Forbidden');
	}

	try {
		const settings = getSettings();
		console.log(`[API SETTINGS] Serving ${Object.keys(settings).length} settings.`);
		return json({ success: true, settings });
	} catch (e) {
		console.error('[API SETTINGS] Failed to fetch:', e);
		throw error(500, 'Failed to fetch settings');
	}
};

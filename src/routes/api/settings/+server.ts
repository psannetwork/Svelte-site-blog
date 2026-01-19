import { json, error } from '@sveltejs/kit';
import { getSettings, setSettings } from '$lib/server/settings';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') throw error(403);

	try {
		const settings = getSettings();

		// 統計情報の取得
		const stats = {
			local: db
				.prepare("SELECT COUNT(*) as count FROM file_storage WHERE storage_type = 'local'")
				.get().count,
			database: db
				.prepare("SELECT COUNT(*) as count FROM file_storage WHERE storage_type = 'database'")
				.get().count
		};

		return json({ success: true, settings, stats });
	} catch (e) {
		throw error(500);
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') throw error(403);

	try {
		const settingsToUpdate = await request.json();
		setSettings(settingsToUpdate);
		const updatedSettings = getSettings();
		return json({ success: true, settings: updatedSettings });
	} catch (e) {
		console.error('[API SETTINGS] Save failed:', e);
		throw error(500);
	}
};

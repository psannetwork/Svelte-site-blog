import db from '$lib/server/db';
import { getSetting } from '$lib/server/settings';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'editor')) {
		throw redirect(302, '/dashboard');
	}

	const ensurePage = (id: string, title: string, settingKey: string) => {
		const exists = db.prepare('SELECT 1 FROM pages WHERE id = ?').get(id);
		if (!exists) {
			// 設定ページにデータが残っていれば移行、なければ空
			const legacyContent = getSetting(settingKey, '');
			db.prepare(
				'INSERT INTO pages (id, title, content, raw_json, updated_at) VALUES (?, ?, ?, ?, ?)'
			).run(
				id,
				title,
				'', // content (HTML) は編集時に生成される
				legacyContent || JSON.stringify({ blocks: [] }),
				Date.now()
			);
		}
	};

	ensurePage('home', 'Home Page (Hero)', 'home_hero_content');
	ensurePage('about', 'About Page', 'about_page_content');
	ensurePage('error404', '404 Error Page', 'error_404_content');
	ensurePage('error500', '500 Error Page', 'error_500_content');

	const pages = db.prepare('SELECT * FROM pages ORDER BY updated_at DESC').all();
	return { pages };
};

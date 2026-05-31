import db from '$lib/server/db';
import { error, redirect, fail } from '@sveltejs/kit';
import { sanitizeHtml } from '$lib/utils/htmlSanitizer';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'editor')) {
		throw redirect(302, '/dashboard');
	}

	const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(params.id) as any;
	if (!page) throw error(404, 'Page not found');

	return { page };
};

export const actions: Actions = {
	savePage: async ({ request, params }) => {
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const editorHtml = formData.get('content') as string;
		
		const showInNav = formData.get('showInNav') === 'on' ? 1 : 0;
		const showInFooter = formData.get('showInFooter') === 'on' ? 1 : 0;
		
		const sanitizedHtml = editorHtml ? sanitizeHtml(editorHtml) : '';

		db.prepare(
			'UPDATE pages SET title = ?, content = ?, updated_at = ?, show_in_nav = ?, show_in_footer = ? WHERE id = ?'
		).run(title, sanitizedHtml, Date.now(), showInNav, showInFooter, params.id);

		const updatedPage = db.prepare('SELECT * FROM pages WHERE id = ?').get(params.id);

		return { success: true, page: updatedPage };
	}};

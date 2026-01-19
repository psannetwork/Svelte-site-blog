import { fail, redirect } from '@sveltejs/kit';
import db from '$lib/server/db';
import { generateIdFromEntropySize } from 'lucia';
import { editorJsToHtml } from '$lib/server/editor';
import { getSettings } from '$lib/server/settings';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'editor')) {
		throw redirect(302, '/auth/login');
	}
	return { settings: getSettings() };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'editor')) {
			throw redirect(302, '/dashboard');
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const summary = formData.get('summary') as string;
		const visibility = formData.get('visibility') as string;
		const editorDataRaw = formData.get('editorData') as string;

		if (!title || !editorDataRaw) {
			return fail(400, { message: 'Title and content are required' });
		}

		let htmlContent = '';
		try {
			const editorData = JSON.parse(editorDataRaw);
			htmlContent = editorJsToHtml(editorData.blocks);
		} catch (e) {
			return fail(400, { message: 'Invalid editor data' });
		}

		const postId = generateIdFromEntropySize(10);
		const now = Date.now();

		db.prepare(
			`
			INSERT INTO post (id, title, summary, content, raw_json, author_id, visibility, created_at, updated_at) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`
		).run(
			postId,
			title,
			summary,
			htmlContent,
			editorDataRaw,
			locals.user.id,
			visibility || 'public',
			now,
			now
		);

		throw redirect(302, '/dashboard/posts');
	}
};

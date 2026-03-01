import { fail, redirect } from '@sveltejs/kit';
import db from '$lib/server/db';
import { generateIdFromEntropySize } from 'lucia';
import { sanitizeHtml } from '$lib/utils/htmlSanitizer';
import { getSettings } from '$lib/server/settings';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || !['admin', 'editor', 'author'].includes(locals.user.role)) {
		throw redirect(302, '/auth/login');
	}
	return { settings: getSettings() };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user || !['admin', 'editor', 'author'].includes(locals.user.role)) {
			throw redirect(302, '/dashboard');
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const summary = formData.get('summary') as string;
		let visibility = formData.get('visibility') as string;
		const editorHtml = formData.get('editorHtml') as string;
		let thumbnailUrl = formData.get('thumbnail_url') as string;

		if (locals.user.role === 'author' && !['draft', 'review'].includes(visibility)) {
			visibility = 'draft';
		}

		if (!title || !editorHtml) {
			return fail(400, { message: 'Title and content are required' });
		}

		// サニタイズを適用
		const sanitizedHtml = sanitizeHtml(editorHtml);

		// サムネイルが指定されていない場合、最初の画像を探す
		if (!thumbnailUrl || thumbnailUrl.trim() === '') {
			const imgMatch = editorHtml.match(/<img[^>]+src="([^"]+)"/);
			if (imgMatch && imgMatch[1]) {
				thumbnailUrl = imgMatch[1];
			}
		}

		const postId = generateIdFromEntropySize(10);
		const now = Date.now();

		db.prepare(
			`
			INSERT INTO post (id, title, summary, content, author_id, visibility, created_at, updated_at, thumbnail_url)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`
		).run(
			postId,
			title,
			summary,
			sanitizedHtml,
			locals.user.id,
			visibility || 'draft',
			now,
			now,
			thumbnailUrl || null
		);

		throw redirect(302, '/dashboard/posts');
	}
};

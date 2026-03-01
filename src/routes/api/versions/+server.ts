import { json, error } from '@sveltejs/kit';
import db from '$lib/server/db';
import { generateIdFromEntropySize } from 'lucia';
import type { RequestHandler } from './$types';

// バージョン一覧取得
export const GET: RequestHandler = async ({ url, locals }) => {
	const postId = url.searchParams.get('post');
	if (!postId) throw error(400, 'Post ID required');

	const versions = db
		.prepare(
			`
			SELECT v.*, u.username
			FROM post_versions v
			LEFT JOIN user u ON v.author_id = u.id
			WHERE v.post_id = ?
			ORDER BY v.version DESC
			LIMIT 50
		`
		)
		.all(postId) as any[];

	return json({ versions });
};

// バージョン保存
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const { postId, content, parentVersion, commitMessage } = await request.json();

	if (!postId || !content) throw error(400, 'Post ID and content required');

	// 現在のバージョンを取得
	const currentVersion = db
		.prepare('SELECT MAX(version) as version FROM post_versions WHERE post_id = ?')
		.get(postId) as { version: number } | null;

	const newVersion = (currentVersion?.version || 0) + 1;
	const versionId = generateIdFromEntropySize(10);

	db.prepare(
		`
		INSERT INTO post_versions (id, post_id, version, content, author_id, created_at, parent_version, commit_message)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`
	).run(
		versionId,
		postId,
		newVersion,
		content,
		locals.user.id,
		Date.now(),
		parentVersion || newVersion - 1,
		commitMessage || `Version ${newVersion}`
	);

	return json({ success: true, version: newVersion, versionId });
};

// 特定バージョン取得
export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const { postId, version } = await request.json();

	if (!postId || version === undefined) throw error(400, 'Post ID and version required');

	const versionData = db
		.prepare('SELECT * FROM post_versions WHERE post_id = ? AND version = ?')
		.get(postId, version) as any;

	if (!versionData) throw error(404, 'Version not found');

	return json({ version: versionData });
};

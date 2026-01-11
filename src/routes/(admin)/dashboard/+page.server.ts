import db from "$lib/server/db";
import { getSettings } from "$lib/server/settings";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, "/auth/login");

	const posts = db.prepare(`SELECT * FROM post ORDER BY created_at DESC`).all() as any[];
	const comments = db.prepare(`
		SELECT comment.*, user.username, post.title as post_title 
		FROM comment 
		JOIN user ON comment.author_id = user.id 
		JOIN post ON comment.post_id = post.id
		ORDER BY created_at DESC
	`).all() as any[];
	
	const settings = getSettings();

	// アクセス統計の取得
	const totalHits = db.prepare("SELECT SUM(hits) as total FROM analytics").get() as { total: number };
	const todayStats = db.prepare("SELECT hits, unique_visitors FROM analytics WHERE date = ?").get(new Date().toISOString().split('T')[0]) as { hits: number, unique_visitors: number };
	const weeklyStats = db.prepare("SELECT * FROM analytics ORDER BY date DESC LIMIT 7").all() as any[];

	return {
		posts,
		comments,
		settings,
		user: locals.user,
		stats: {
			totalHits: totalHits?.total || 0,
			todayHits: todayStats?.hits || 0,
			todayUniques: todayStats?.unique_visitors || 0,
			weekly: weeklyStats
		}
	};
};

<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	
	let { data, form } = $props<{ data: PageData, form: ActionData }>();
	let replyingTo = $state<string | null>(null);

	// コメントをツリー構造に変換
	const commentTree = $derived.by(() => {
		const map = new Map();
		const roots: any[] = [];
		data.comments.forEach(c => {
			map.set(c.id, { ...c, replies: [] });
		});
		data.comments.forEach(c => {
			const node = map.get(c.id);
			if (c.parent_id && map.has(c.parent_id)) {
				map.get(c.parent_id).replies.push(node);
			} else {
				roots.push(node);
			}
		});
		return roots;
	});
</script>

{#snippet commentItem(comment, depth = 0)}
	<!-- depth に応じてインデント。最大 2階層までずらす -->
	<div class="flex gap-4 group {depth > 0 && depth <= 2 ? 'ml-6 md:ml-10 mt-6 pt-6 border-t border-slate-50 dark:border-slate-800/50' : 'mt-10'} {depth > 2 ? 'mt-6 pt-6 border-t border-slate-50 dark:border-slate-800/50' : ''}">
		<div class="{depth > 0 ? 'w-8 h-8' : 'w-10 h-10'} rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 shadow-sm">
			{#if comment.avatar_url}
				<img src={comment.avatar_url} alt="" class="w-full h-full object-cover" />
			{:else}
				<div class="w-full h-full flex items-center justify-center text-xs font-black text-slate-400 uppercase">
					{comment.author_name.substring(0,1)}
				</div>
			{/if}
		</div>
		<div class="flex-1 min-w-0">
			<div class="flex items-center justify-between gap-4 mb-1">
				<div class="flex items-center gap-2">
					<span class="text-sm font-black dark:text-white truncate">{comment.author_name}</span>
					{#if comment.author_role === 'admin'}
						<span class="text-[8px] font-black px-1.5 py-0.5 bg-psan-green text-white rounded uppercase tracking-widest shrink-0">Admin</span>
					{/if}
				</div>
				<time class="text-[10px] font-bold opacity-30 uppercase whitespace-nowrap">{new Date(comment.created_at).toLocaleString()}</time>
			</div>
			<p class="text-sm font-medium opacity-70 leading-relaxed dark:text-slate-300 whitespace-pre-wrap">{comment.content}</p>
			
			<div class="flex items-center gap-4 mt-2">
				<button 
					onclick={() => replyingTo = replyingTo === comment.id ? null : comment.id}
					class="text-[10px] font-black text-psan-green uppercase tracking-widest hover:underline"
				>
					{replyingTo === comment.id ? 'Cancel' : 'Reply'}
				</button>
				
				{#if data.user?.role === 'admin' || data.user?.role === 'editor'}
					<form method="POST" action="?/deleteComment" use:enhance>
						<input type="hidden" name="id" value={comment.id} />
						<button type="submit" class="text-[10px] font-black text-psan-pink opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest hover:underline">Delete</button>
					</form>
				{/if}
			</div>

			{#if replyingTo === comment.id}
				<form method="POST" action="?/addComment" use:enhance={() => { replyingTo = null; }} class="mt-4 space-y-4">
					<input type="hidden" name="parentId" value={comment.id} />
					<textarea 
						name="content" 
						rows="3" 
						required
						class="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-psan-green"
						placeholder="リプライを入力..."
					></textarea>
					<button type="submit" class="btn-psan-primary py-2 px-6 text-xs uppercase tracking-widest">Send Reply</button>
				</form>
			{/if}

			<!-- 再帰的にレンダー (depth を増やす) -->
			{#each comment.replies as reply}
				{@render commentItem(reply, depth + 1)}
			{/each}
		</div>
	</div>
{/snippet}

<article class="max-w-4xl mx-auto px-4 py-20">
	<header class="mb-12">
		<h1 class="text-4xl md:text-6xl font-black tracking-tighter dark:text-white leading-[1.1]">{data.post.title}</h1>
	</header>

	<div class="prose prose-slate dark:prose-invert max-w-none mb-20 border-b border-slate-100 dark:border-slate-800 pb-20">
		{@html data.post.content}
	</div>

	<section id="comments" class="max-w-3xl mx-auto">
		<h2 class="text-2xl font-black tracking-tighter mb-10 uppercase">Feedback ({data.comments.length})</h2>

		<div class="space-y-4 mb-16">
			{#each commentTree as comment}
				{@render commentItem(comment)}
			{:else}
				<p class="text-center py-10 text-xs font-bold opacity-30 uppercase tracking-widest">No comments yet.</p>
			{/each}
		</div>

		{#if data.settings.allow_comments}
			{#if data.user || data.settings.allow_anonymous_comments}
				<form method="POST" action="?/addComment" use:enhance class="card-psan p-6 md:p-10 space-y-6">
					<h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">New Comment</h3>
					<textarea 
						name="content" 
						rows="4" 
						required
						class="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl p-6 text-base font-medium focus:ring-2 focus:ring-psan-green transition-all"
						placeholder="Write something..."
					></textarea>
					<div class="flex justify-end">
						<button type="submit" class="btn-psan-primary px-12">Post Comment</button>
					</div>
				</form>
			{:else}
				<div class="card-psan p-10 text-center border-dashed border-2">
					<p class="text-sm font-bold opacity-40 mb-6 uppercase tracking-widest">Login required to comment</p>
					<a href="/auth/login" class="btn-psan-primary inline-flex">Login Now</a>
				</div>
			{/if}
		{/if}
	</section>
</article>

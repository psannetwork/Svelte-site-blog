<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	
	let { data, form } = $props<{ data: PageData, form: ActionData }>();
	let replyingTo = $state<string | null>(null);

	// コメントをツリー構造に変換
	const commentTree = $derived.by(() => {
		const map = new Map<string, any>();
		const roots: any[] = [];
		data.comments.forEach((c: any) => {
			map.set(c.id, { ...c, replies: [] });
		});
		data.comments.forEach((c: any) => {
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

{#snippet commentItem(comment: any, depth = 0)}
	<!-- depth に応じてインデント -->
	<div class="flex gap-4 group {depth > 0 && depth <= 2 ? 'ml-6 md:ml-10 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800/50 relative before:absolute before:left-[-20px] before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800/50 before:content-[\'\']' : 'mt-10'} {depth > 2 ? 'mt-6 pt-6 border-t border-slate-200 dark:border-slate-800/50' : ''}">
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
						<span class="text-[10px] font-black px-2 py-1 bg-psan-green text-white rounded-md uppercase tracking-wider shrink-0">Admin</span>
					{/if}
				</div>
				<time class="text-xs font-bold text-muted uppercase whitespace-nowrap">{new Date(comment.created_at).toLocaleString()}</time>
			</div>
			<p class="text-base font-medium leading-relaxed dark:text-slate-300 whitespace-pre-wrap">{comment.content}</p>
			
			<div class="flex items-center gap-2 mt-3">
				<button 
					onclick={() => replyingTo = replyingTo === comment.id ? null : comment.id}
					class="btn-action-sm flex items-center gap-1.5 !text-psan-green"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
					{replyingTo === comment.id ? 'Cancel' : 'Reply'}
				</button>
				
				{#if data.user?.role === 'admin' || data.user?.role === 'editor'}
					<form method="POST" action="?/deleteComment" use:enhance={({ cancel }) => {
						if (!confirm('このコメントを削除しますか？')) {
							cancel();
						}
						return async ({ update }) => {
							await update();
						};
					}}>
						<input type="hidden" name="id" value={comment.id} />
						<button type="submit" class="btn-action-sm flex items-center gap-1.5 !text-psan-pink">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
							Delete
						</button>
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
						class="w-full bg-secondary dark:bg-slate-900 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-psan-green"
						placeholder="リプライを入力..."
					></textarea>
					<button type="submit" class="btn-psan-primary py-2 px-6 text-xs uppercase tracking-widest">Send Reply</button>
				</form>
			{/if}

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

	<div class="prose prose-slate prose-xl dark:prose-invert max-w-none mb-20 border-b border-slate-100 dark:border-slate-800 pb-20 prose-img:rounded-[40px] prose-img:shadow-2xl">
		{@html data.post.content}
	</div>

	<section id="comments" class="max-w-3xl mx-auto my-20">
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
						class="w-full bg-secondary dark:bg-slate-900 border-none rounded-2xl p-6 text-base font-medium focus:ring-2 focus:ring-psan-green transition-all"
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
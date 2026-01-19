<script lang="ts">
	import { enhance } from '$app/forms';
	let { data } = $props();

	// ツリー構造の構築
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
	<div class="space-y-4">
		<div
			class="card-psan p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow {depth > 0
				? 'ml-4 md:ml-12 bg-slate-50/50 dark:bg-slate-900/30'
				: ''}"
		>
			<div
				class="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700"
			>
				{#if comment.avatar_url}
					<img src={comment.avatar_url} alt="" class="w-full h-full object-cover" />
				{:else}
					<span class="text-xs font-black text-slate-400 uppercase"
						>{comment.author_name.substring(0, 1)}</span
					>
				{/if}
			</div>
			<div class="flex-1 space-y-3">
				<div class="flex flex-wrap items-center justify-between gap-y-2">
					<div class="flex items-center gap-3">
						<span class="text-sm font-black text-main">{comment.author_name}</span>
						<span class="text-xs font-medium text-muted"
							>{new Date(comment.created_at).toLocaleString()}</span
						>
					</div>
					<a
						href="/pages/{comment.post_id}#comment-{comment.id}"
						class="text-[10px] font-bold px-3 py-1 bg-white dark:bg-slate-800 rounded-full uppercase text-muted hover:text-psan-green transition-colors border border-slate-100 dark:border-slate-700"
					>
						on {comment.post_title}
					</a>
				</div>
				<p
					class="text-sm font-medium text-main dark:text-slate-300 leading-relaxed bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800"
				>
					{comment.content}
				</p>
				<div class="flex justify-end pt-2">
					<form
						method="POST"
						action="/pages/{comment.post_id}?/deleteComment"
						use:enhance={({ cancel }) => {
							if (!confirm('このコメントを削除しますか？')) cancel();
							return async ({ update }) => {
								await update();
							};
						}}
					>
						<input type="hidden" name="id" value={comment.id} />
						<button
							class="flex items-center gap-2 text-xs font-bold text-psan-pink hover:bg-psan-pink/10 px-4 py-2 rounded-lg transition-colors uppercase tracking-wider"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/></svg
							>
							Delete
						</button>
					</form>
				</div>
			</div>
		</div>

		{#if comment.replies.length > 0}
			<div class="space-y-4">
				{#each comment.replies as reply}
					{@render commentItem(reply, depth + 1)}
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<div class="max-w-7xl mx-auto px-4 py-8">
	<header class="mb-12">
		<h2 class="text-4xl font-black tracking-tighter text-psan-pink uppercase">Comments</h2>
		<p class="text-muted font-medium">読者からのフィードバックを管理します。</p>
	</header>

	<div class="space-y-6">
		{#each commentTree as comment}
			{@render commentItem(comment)}
		{:else}
			<div class="py-20 text-center card-psan border-dashed border-2">
				<p class="font-bold text-muted uppercase tracking-widest text-xs">No comments yet.</p>
			</div>
		{/each}
	</div>
</div>

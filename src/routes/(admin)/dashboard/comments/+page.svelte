<script lang="ts">
	import { enhance } from '$app/forms';
	let { data } = $props();
</script>

<div class="max-w-7xl mx-auto">
	<header class="mb-12">
		<h2 class="text-4xl font-black tracking-tighter text-psan-pink uppercase">Comments</h2>
		<p class="text-muted font-medium">読者からのフィードバックを管理します。</p>
	</header>

	<div class="grid gap-4">
		{#each data.comments as comment}
			<div class="card-psan p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
				<div
					class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500 font-bold uppercase"
				>
					{comment.username.substring(0, 1)}
				</div>
				<div class="flex-1 space-y-3">
					<div class="flex flex-wrap items-center justify-between gap-y-2">
						<div class="flex items-center gap-3">
							<span class="text-sm font-black text-main">{comment.username}</span>
							<span class="text-xs font-medium text-muted"
								>{new Date(comment.created_at).toLocaleString()}</span
							>
						</div>
						<a
							href="/pages/{comment.post_id}#comment-{comment.id}"
							class="text-[10px] font-bold px-3 py-1 bg-secondary dark:bg-slate-800 rounded-full uppercase text-muted hover:text-main transition-colors"
						>
							on {comment.post_title}
						</a>
					</div>
					<p
						class="text-sm font-medium text-main dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800"
					>
						{comment.content}
					</p>
					<div class="flex justify-end pt-2">
						<form method="POST" action="/pages/{comment.post_id}?/deleteComment" use:enhance>
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
								Delete Comment
							</button>
						</form>
					</div>
				</div>
			</div>
		{:else}
			<div class="py-20 text-center card-psan border-dashed border-2 border-[--border-color]">
				<p class="font-bold text-muted uppercase tracking-widest text-xs">No comments yet.</p>
			</div>
		{/each}
	</div>
</div>

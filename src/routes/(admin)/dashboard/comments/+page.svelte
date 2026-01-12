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
			<div class="card-psan p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
				<div class="flex-1">
					<div class="flex items-center gap-3 mb-2">
						<span class="text-[10px] font-black tracking-widest text-psan-green uppercase">{comment.username}</span>
						<span class="text-[10px] font-black tracking-widest text-muted opacity-50">{new Date(comment.created_at).toLocaleString()}</span>
						<span class="text-[10px] font-bold px-2 py-0.5 bg-secondary dark:bg-slate-800 rounded uppercase text-main">on {comment.post_title}</span>
					</div>
					<p class="font-medium text-main dark:text-slate-300">{comment.content}</p>
				</div>
				<form method="POST" action="/pages/{comment.post_id}?/deleteComment" use:enhance>
					<input type="hidden" name="id" value={comment.id} />
					<button class="px-4 py-2 rounded-xl font-bold text-sm text-psan-pink hover:bg-psan-pink/10 transition-all uppercase tracking-widest">Delete</button>
				</form>
			</div>
		{:else}
			<div class="py-20 text-center card-psan border-dashed border-2 border-[--border-color]">
				<p class="font-bold text-muted uppercase tracking-widest text-xs">No comments yet.</p>
			</div>
		{/each}
	</div>
</div>

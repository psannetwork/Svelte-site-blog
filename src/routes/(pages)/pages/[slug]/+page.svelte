<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	
	let { data, form } = $props<{ data: PageData, form: ActionData }>();
</script>

<svelte:head>
	{#if data.settings.enable_turnstile}
		<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
	{/if}
</svelte:head>

<article class="max-w-4xl mx-auto px-4 py-20">
	<header class="mb-12">
		<div class="flex items-center gap-3 text-[10px] font-black tracking-widest text-psan-green uppercase mb-4">
			<span>{new Date(data.post.created_at).toLocaleDateString("ja-JP")}</span>
			<span class="w-1 h-1 bg-slate-300 rounded-full"></span>
			<span>{data.post.visibility}</span>
		</div>
		<h1 class="text-4xl md:text-6xl font-black tracking-tighter dark:text-white leading-[1.1]">
			{data.post.title}
		</h1>
	</header>

	<div class="prose prose-slate dark:prose-invert max-w-none mb-20 border-b border-slate-100 dark:border-slate-800 pb-20">
		{@html data.post.content}
	</div>

	<!-- コメントセクション -->
	<section id="comments" class="max-w-3xl mx-auto">
		<div class="flex items-center justify-between mb-10">
			<h2 class="text-2xl font-black tracking-tighter dark:text-white uppercase">Feedback ({data.comments.length})</h2>
		</div>

		<div class="space-y-8 mb-16">
			{#each data.comments as comment}
				<div class="flex gap-4 group">
					<div class="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 shadow-sm">
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
								<span class="text-sm font-black dark:text-white">{comment.author_name}</span>
								{#if comment.author_role === 'admin'}
									<span class="text-[8px] font-black px-1.5 py-0.5 bg-psan-green text-white rounded uppercase tracking-widest">Admin</span>
								{/if}
							</div>
							<div class="flex items-center gap-3">
								<time class="text-[10px] font-bold opacity-30 uppercase">{new Date(comment.created_at).toLocaleString("ja-JP")}</time>
								{#if data.user?.role === 'admin' || data.user?.role === 'editor'}
									<form method="POST" action="?/deleteComment" use:enhance>
										<input type="hidden" name="id" value={comment.id} />
										<button type="submit" class="text-[10px] font-black text-psan-pink opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest hover:underline">Delete</button>
									</form>
								{/if}
							</div>
						</div>
						<p class="text-sm font-medium opacity-70 leading-relaxed dark:text-slate-300 whitespace-pre-wrap">{comment.content}</p>
					</div>
				</div>
			{:else}
				<p class="text-center py-10 text-xs font-bold opacity-30 uppercase tracking-widest">No comments yet.</p>
			{/each}
		</div>

		{#if data.settings.allow_comments}
			{#if data.user || data.settings.allow_anonymous_comments}
				<form method="POST" action="?/addComment" use:enhance class="card-psan p-6 md:p-8 space-y-6">
					<div class="flex items-center gap-3 mb-2">
						<div class="w-8 h-8 rounded-xl bg-psan-green flex items-center justify-center font-black text-white text-[10px]">
							{data.user ? (data.user.nickname || data.user.username).substring(0,1).toUpperCase() : '?'}
						</div>
						<span class="text-xs font-black uppercase tracking-widest">
							{data.user ? (data.user.nickname || data.user.username) : 'Post as Anonymous'}
						</span>
					</div>
					<textarea 
						name="content" 
						rows="4" 
						required
						class="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-psan-green transition-all"
						placeholder="What are your thoughts?"
					></textarea>
					
					<div class="flex flex-col sm:flex-row items-center justify-between gap-6">
						{#if data.settings.enable_turnstile}
							<div class="cf-turnstile" data-sitekey={data.settings.turnstile_site_key}></div>
						{/if}
						<button type="submit" class="btn-psan-primary w-full sm:w-auto px-10">
							Post Comment
						</button>
					</div>
				</form>
			{:else}
				<div class="card-psan p-8 text-center border-dashed">
					<p class="text-sm font-bold opacity-50 mb-4">Please login to join the conversation.</p>
					<a href="/auth/login" class="btn-psan-primary inline-flex">Login</a>
				</div>
			{/if}
		{:else}
			<p class="text-center text-xs font-bold opacity-30 uppercase tracking-widest">Comments are currently disabled.</p>
		{/if}
	</section>
</article>

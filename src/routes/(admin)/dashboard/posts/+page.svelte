<script lang="ts">
	import { enhance } from '$app/forms';
	let { data } = $props();
</script>

<svelte:head>
	<title>Manage Posts | {data.settings?.site_title || 'Admin'}</title>
</svelte:head>

<div class="max-w-7xl mx-auto">
	<header class="flex flex-col md:flex-row md:items-center justify-between mb-8 md:12 gap-4">
		<div>
			<h2 class="text-3xl md:text-4xl font-black tracking-tighter text-main">POSTS</h2>
			<p class="text-xs md:text-sm text-muted font-bold">
				これまでに公開したストーリーの一覧です。
			</p>
		</div>
		<a href="/dashboard/posts/new" class="btn-psan-primary w-full md:w-auto text-sm">新規投稿作成</a
		>
	</header>

	<div class="grid gap-4 md:gap-6">
		{#each data.posts as post}
			<div
				class="card-psan p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 group"
			>
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 mb-2">
						<span
							class="text-[10px] md:text-xs font-black tracking-widest px-2 py-0.5 rounded
							{post.visibility === 'public'
								? 'bg-psan-green/10 text-psan-green border border-psan-green/20'
								: post.visibility === 'draft'
									? 'bg-slate-100 text-slate-500 border border-slate-200'
									: post.visibility === 'review'
										? 'bg-psan-pink/10 text-psan-pink border border-psan-pink/20 animate-pulse'
										: 'bg-psan-dark/10 text-psan-dark border border-psan-dark/20'} dark:bg-slate-800 dark:text-slate-100 dark:border dark:border-slate-600 uppercase"
						>
							{post.visibility}
						</span>
						<span class="text-[10px] md:text-xs font-black tracking-widest text-muted"
							>{new Date(post.created_at).toLocaleDateString()}</span
						>
					</div>
					<h3
						class="text-xl md:text-2xl font-black text-main group-hover:text-psan-green transition-colors truncate"
					>
						{post.title}
					</h3>
					<p class="text-xs text-muted font-bold line-clamp-1 mt-1">By {post.author_name}</p>
				</div>

				<div
					class="flex items-center justify-between md:justify-end gap-2 md:gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800"
				>
					<form method="POST" action="?/updateStatus" use:enhance class="flex items-center">
						<input type="hidden" name="id" value={post.id} />
						<select
							name="status"
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
							class="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-500 rounded-xl text-xs font-black p-2 pr-8 focus:ring-2 focus:ring-psan-green text-slate-900 dark:text-white cursor-pointer shadow-sm outline-none"
						>
							<option
								class="dark:bg-slate-800 dark:text-white"
								value="draft"
								selected={post.visibility === 'draft'}>DRAFT</option
							>
							<option
								class="dark:bg-slate-800 dark:text-white"
								value="review"
								selected={post.visibility === 'review'}>REVIEW</option
							>
							<option
								class="dark:bg-slate-800 dark:text-white"
								value="public"
								selected={post.visibility === 'public'}>PUBLIC</option
							>
							<option
								class="dark:bg-slate-800 dark:text-white"
								value="unlisted"
								selected={post.visibility === 'unlisted'}>UNLISTED</option
							>
							<option
								class="dark:bg-slate-800 dark:text-white"
								value="vip"
								selected={post.visibility === 'vip'}>VIP</option
							>
							<option
								class="dark:bg-slate-800 dark:text-white"
								value="private"
								selected={post.visibility === 'private'}>PRIVATE</option
							>
						</select>
					</form>

					<div class="flex items-center gap-1 md:gap-2">
						<a
							href="/dashboard/posts/{post.id}"
							class="p-2 md:p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-500 text-slate-600 dark:text-white hover:bg-psan-green/10 hover:text-psan-green hover:border-psan-green/50 dark:hover:border-psan-green/50 transition-all rounded-xl group/edit shadow-sm"
							title="Edit"
						>
							<svg
								class="w-4 h-4 md:w-5 md:h-5 text-current"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2.5"
									d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
								/></svg
							>
						</a>
						<form method="POST" action="?/deletePost" use:enhance>
							<input type="hidden" name="id" value={post.id} />
							<button
								class="p-2 md:p-3 text-psan-pink hover:bg-psan-pink/10 border border-psan-pink/20 rounded-xl transition-all"
								title="Delete"
							>
								<svg
									class="w-4 h-4 md:w-5 md:h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									><path
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/></svg
								>
							</button>
						</form>
					</div>
				</div>
			</div>
		{:else}
			<div class="py-24 text-center card-psan border-dashed border-2 border-[--border-color]">
				<p class="font-bold text-muted uppercase tracking-widest text-xs">No posts found.</p>
			</div>
		{/each}
	</div>
</div>

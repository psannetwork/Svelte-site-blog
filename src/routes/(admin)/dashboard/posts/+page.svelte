<script lang="ts">
	import { enhance } from '$app/forms';
	import { t, type Language } from '$lib/i18n';
	let { data } = $props();
	const lang = $derived((data.settings?.site_language || 'ja') as Language);
</script>

<svelte:head>
	<title>{t(lang, 'posts')} | {data.settings?.site_title || 'Admin'}</title>
</svelte:head>

<div class="max-w-7xl mx-auto">
	<header class="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
		<div class="space-y-1">
			<h2 class="text-4xl md:text-5xl font-black tracking-tighter text-main uppercase leading-none">{t(lang, 'posts')}</h2>
			<p class="text-xs md:text-sm text-muted font-bold tracking-tight">
				{t(lang, 'posts_desc')}
			</p>
		</div>
		<a href="/dashboard/posts/new" class="btn-psan-primary w-full md:w-auto text-sm px-10 py-4 rounded-2xl shadow-xl shadow-psan-green/20">{t(lang, 'create_story')}</a>
	</header>

	<div class="grid gap-6">
		{#each data.posts as post}
			{@const canManage =
				data.user?.role === 'admin' ||
				data.user?.role === 'editor' ||
				(data.user?.role === 'author' && post.author_id === data.user?.id)}
			{@const canEdit =
				canManage &&
				(data.user?.role !== 'author' || ['draft', 'review'].includes(post.visibility))}

			<div
				class="card-dashboard p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group {!canManage
					? 'opacity-60 grayscale'
					: ''} hover:border-psan-green transition-all"
			>
				<div class="flex items-center gap-6 flex-1 min-w-0">
					<div
						class="w-20 h-20 md:w-24 md:h-24 rounded-[24px] bg-slate-50 dark:bg-slate-800 shrink-0 overflow-hidden border border-slate-100 dark:border-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform"
					>
						{#if post.thumbnail_url}
							<img src={post.thumbnail_url} alt="" class="w-full h-full object-cover" />
						{:else}
							<span class="text-2xl font-black text-muted opacity-30 uppercase"
								>{post.title.substring(0, 1)}</span
							>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-3 mb-2">
							<span
								class="text-[10px] font-black tracking-widest px-3 py-1 rounded-full
								{post.visibility === 'public'
									? 'bg-psan-green/10 text-psan-green'
									: post.visibility === 'draft'
										? 'bg-slate-100 text-slate-500 dark:bg-slate-700'
										: post.visibility === 'review'
											? 'bg-psan-pink/10 text-psan-pink animate-pulse'
											: 'bg-slate-200 text-slate-600'} uppercase"
							>
								{post.visibility}
							</span>
							<span class="text-[10px] font-black tracking-widest text-muted uppercase"
								>{new Date(post.created_at).toLocaleDateString()}</span
							>
						</div>
						<h3
							class="text-xl md:text-2xl font-black text-main group-hover:text-psan-green transition-colors truncate tracking-tight"
						>
							{post.title}
						</h3>
						<div class="mt-2 flex items-center gap-1.5 px-3 py-1 bg-psan-pink/10 dark:bg-psan-pink/20 rounded-full border border-psan-pink/20 dark:border-psan-pink/40 w-fit text-psan-pink transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-110 hover:shadow-xl hover:shadow-psan-pink/30 hover:bg-psan-pink hover:text-white cursor-default">
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
							<span class="text-[9px] font-black uppercase tracking-widest italic">{t(lang, 'by_author').replace('{author}', post.author_name)}</span>
						</div>
					</div>
				</div>

				<div
					class="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-6 md:pt-0 border-slate-100 dark:border-slate-800"
				>
					<form method="POST" action="?/updateStatus" use:enhance class="flex items-center">
						<input type="hidden" name="id" value={post.id} />
						<select
							name="status"
							disabled={!canEdit}
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
							class="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-500 rounded-xl text-[10px] font-black p-3 pr-10 focus:ring-2 focus:ring-psan-green text-main cursor-pointer shadow-sm outline-none disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
						>
							<option value="draft" selected={post.visibility === 'draft'}>DRAFT</option>
							<option value="review" selected={post.visibility === 'review'}>REVIEW</option>
							<option value="public" disabled={data.user?.role === 'author'} selected={post.visibility === 'public'}>PUBLIC</option>
							<option value="unlisted" disabled={data.user?.role === 'author'} selected={post.visibility === 'unlisted'}>UNLISTED</option>
							<option value="vip" disabled={data.user?.role === 'author'} selected={post.visibility === 'vip'}>VIP</option>
							<option value="private" disabled={data.user?.role === 'author'} selected={post.visibility === 'private'}>PRIVATE</option>
						</select>
					</form>

					<div class="flex items-center gap-2">
						<a
							href={canEdit ? `/dashboard/posts/${post.id}` : 'javascript:void(0)'}
							class="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-500 text-slate-600 dark:text-white hover:bg-psan-green hover:text-white hover:border-psan-green transition-all rounded-2xl group/edit shadow-sm {!canEdit
								? 'opacity-30 grayscale cursor-not-allowed pointer-events-none'
								: ''}"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
						</a>
						<form
							method="POST"
							action="?/deletePost"
							use:enhance={({ cancel }) => {
								if (!confirm('本当に削除しますか？')) return cancel();
								return async ({ update }) => {
									await update();
								};
							}}
						>
							<input type="hidden" name="id" value={post.id} />
							<button
								disabled={!canEdit}
								class="w-12 h-12 flex items-center justify-center text-psan-pink hover:bg-psan-pink hover:text-white border border-psan-pink/20 rounded-2xl transition-all disabled:opacity-30"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
							</button>
						</form>
					</div>
				</div>
			</div>
		{:else}
			<div class="py-32 text-center card-dashboard border-dashed border-2 border-slate-200 dark:border-slate-800">
				<p class="font-black text-muted uppercase tracking-[0.3em] text-[10px]">{t(lang, 'no_data')}</p>
			</div>
		{/each}
	</div>
</div>
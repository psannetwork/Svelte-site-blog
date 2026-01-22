<script lang="ts">
	import { enhance } from '$app/forms';
	import { t, type Language } from '$lib/i18n';
	let { data } = $props();
	const lang = $derived((data.settings?.site_language || 'ja') as Language);
</script>

<svelte:head>
	<title>{t(lang, 'comments')} | {data.settings?.site_title || 'Admin'}</title>
</svelte:head>

<div class="max-w-7xl mx-auto">
	<header class="mb-12">
		<h2 class="text-4xl md:text-5xl font-black tracking-tighter text-main uppercase leading-none">{t(lang, 'comments')}</h2>
		<p class="text-xs md:text-sm text-muted font-bold tracking-tight mt-2">
			{t(lang, 'comments_desc')}
		</p>
	</header>

	<div class="grid gap-6">
		{#each data.comments as comment}
			<div class="card-dashboard p-8 space-y-6 hover:border-psan-pink transition-all group">
				<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 rounded-2xl bg-psan-pink/10 flex items-center justify-center text-psan-pink shadow-sm">
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
						</div>
						<div>
							<div class="flex items-center gap-2 mb-1">
								<span class="block font-black text-main uppercase text-sm tracking-tight">{comment.author_name}</span>
								{#if comment.parent_author_name}
									<div class="flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black text-muted uppercase tracking-widest border border-slate-200 dark:border-slate-700">
										<svg class="w-2.5 h-2.5 text-psan-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
										{t(lang, 'replied_to')} {comment.parent_author_name}
									</div>
								{/if}
							</div>
							<span class="text-[10px] font-black text-muted uppercase tracking-widest">{new Date(comment.created_at).toLocaleString()}</span>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<form
							method="POST"
							action="?/deleteComment"
							use:enhance={({ cancel }) => {
								if (!confirm('本当に削除しますか？')) return cancel();
								return async ({ update }) => {
									await update();
								};
							}}
						>
							<input type="hidden" name="id" value={comment.id} />
							<button class="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-psan-pink text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-psan-pink hover:text-white transition-all">
								Delete
							</button>
						</form>
					</div>
				</div>
				<div class="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100 dark:border-slate-700">
					<p class="text-main font-bold leading-relaxed">{comment.content}</p>
					<div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-[10px] font-black text-muted uppercase tracking-widest">
						<svg class="w-3 h-3 text-psan-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
						<span class="text-psan-green">{t(lang, 'on_post')}</span>
						<span class="text-main truncate">{comment.post_title}</span>
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
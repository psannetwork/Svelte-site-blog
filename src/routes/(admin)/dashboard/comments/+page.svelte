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
	<header class="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
		<div class="space-y-1">
			<h2 class="text-4xl md:text-5xl font-black tracking-tighter text-main uppercase leading-none">{t(lang, 'comments')}</h2>
			<p class="text-xs md:text-sm text-muted font-bold tracking-tight">
				{t(lang, 'comments_desc')}
			</p>
		</div>
	</header>

	<div class="grid gap-6">
		{#each data.comments as comment}
			<!-- Card with Left Accent Border: Green for Root, Pink for Reply -->
			<div 
				class="relative card-dashboard p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group transition-all border-l-[12px] 
				{comment.parent_id ? 'border-l-psan-pink/40 bg-psan-pink/[0.01]' : 'border-l-psan-green/40 bg-psan-green/[0.01]'} hover:border-l-psan-pink active:scale-[0.99]"
			>
				<div class="flex items-start md:items-center gap-6 flex-1 min-w-0">
					<!-- AVATAR with Status Icon -->
					<div class="relative shrink-0">
						<div class="w-16 h-16 md:w-20 md:h-20 rounded-[24px] bg-white dark:bg-slate-800 overflow-hidden border border-slate-100 dark:border-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
							{#if comment.avatar_url}
								<img src={comment.avatar_url} alt="" class="w-full h-full object-cover" />
							{:else}
								<span class="text-xl font-black text-muted opacity-30 uppercase">
									{comment.author_name.substring(0, 1)}
								</span>
							{/if}
						</div>
						{#if comment.parent_id}
							<div class="absolute -right-2 -bottom-1 w-7 h-7 bg-psan-pink text-white rounded-full flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-slate-900 scale-90 md:scale-100">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
							</div>
						{/if}
					</div>

					<div class="flex-1 min-w-0">
						<div class="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
							<span class="text-base font-black text-main uppercase tracking-tight">{comment.author_name}</span>
							
							{#if comment.parent_author_name}
								<span class="text-[10px] font-black text-psan-pink uppercase tracking-widest flex items-center gap-1.5">
									<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
									{t(lang, 'replied_to')} {comment.parent_author_name}
								</span>
							{/if}

							<span class="text-[10px] font-black tracking-widest text-muted uppercase ml-auto md:ml-0 opacity-60">
								{new Date(comment.created_at).toLocaleString()}
							</span>
						</div>

						<!-- PARENT CONTENT PREVIEW (Speech bubble style) -->
						{#if comment.parent_content}
							<div class="mb-4 relative">
								<div class="p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 text-xs text-muted font-medium line-clamp-1 italic pl-4 border-l-4 border-l-psan-pink/20">
									"{comment.parent_content}"
								</div>
							</div>
						{/if}

						<!-- MAIN COMMENT TEXT -->
						<div class="relative">
							<p class="text-base md:text-lg font-bold text-main leading-relaxed group-hover:text-psan-pink transition-colors">
								{comment.content}
							</p>
						</div>

						<!-- TARGET POST TAG -->
						<div class="mt-4 flex items-center gap-2">
							<div class="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-2 max-w-full">
								<svg class="w-3 h-3 text-psan-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
								<span class="text-[9px] font-black text-muted uppercase tracking-widest truncate">{t(lang, 'on_post')}: {comment.post_title}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- ACTIONS -->
				<div class="flex items-center justify-end gap-3 border-t md:border-t-0 pt-6 md:pt-0 border-slate-100 dark:border-slate-800">
					<form
						method="POST"
						action="?/deleteComment"
						use:enhance={({ cancel }) => {
							if (!confirm(t(lang, 'delete_confirm'))) return cancel();
							return async ({ update }) => {
								await update();
							};
						}}
					>
						<input type="hidden" name="id" value={comment.id} />
						<button 
							type="submit"
							class="w-12 h-12 flex items-center justify-center text-psan-pink hover:bg-psan-pink hover:text-white border border-psan-pink/20 rounded-2xl transition-all shadow-sm active:scale-95"
							title="Delete"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
						</button>
					</form>
				</div>
			</div>
		{:else}
			<div class="py-32 text-center card-dashboard border-dashed border-2 border-slate-200 dark:border-slate-800">
				<p class="font-black text-muted uppercase tracking-[0.3em] text-[10px]">{t(lang, 'no_data')}</p>
			</div>
		{/each}
	</div>
</div>
<script lang="ts">
	import { t, type Language } from '$lib/i18n';
	let { data } = $props();
	const lang = $derived((data.settings?.site_language || 'ja') as Language);
</script>

<svelte:head>
	<title>{t(lang, 'pages')} | {data.settings?.site_title || 'Admin'}</title>
</svelte:head>

<div class="max-w-7xl mx-auto">
	<header class="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
		<div class="space-y-1">
			<h2 class="text-4xl md:text-5xl font-black tracking-tighter text-main uppercase leading-none">{t(lang, 'static_pages')}</h2>
			<p class="text-xs md:text-sm text-muted font-bold tracking-tight">
				{t(lang, 'static_pages_desc')}
			</p>
		</div>
		<a href="/dashboard/pages/new" class="btn-psan-primary w-full md:w-auto text-sm px-10 py-4 rounded-2xl shadow-xl shadow-psan-green/20">{t(lang, 'create_page')}</a>
	</header>

	<div class="grid gap-6">
		{#each data.pages as page}
			<div class="card-dashboard p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-psan-green transition-all">
				<div class="flex items-center gap-6">
					<div class="w-16 h-16 rounded-[20px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-psan-green group-hover:scale-110 transition-transform shadow-sm">
						<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
					</div>
					<div>
						<h3 class="text-2xl font-black text-main tracking-tight group-hover:text-psan-green transition-colors">{page.title}</h3>
						<div class="flex items-center gap-3 mt-1">
							<span class="text-[10px] font-black text-muted uppercase tracking-widest">slug: {page.slug}</span>
							<span class="w-1 h-1 rounded-full bg-slate-300"></span>
							<span class="text-[10px] font-black text-muted uppercase tracking-widest">{new Date(page.updated_at).toLocaleDateString()}</span>
						</div>
					</div>
				</div>

				<div class="flex items-center gap-3 border-t md:border-t-0 pt-6 md:pt-0 border-slate-100 dark:border-slate-800">
					<a href="/{page.id}" target="_blank" class="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all text-muted">{t(lang, 'view_site')}</a>
					<a href="/dashboard/pages/{page.id}" class="px-8 py-3 bg-psan-green text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-psan-green/20">Edit</a>
				</div>
			</div>
		{:else}
			<div class="py-32 text-center card-dashboard border-dashed border-2 border-slate-200 dark:border-slate-800">
				<p class="font-black text-muted uppercase tracking-[0.3em] text-[10px]">{t(lang, 'no_data')}</p>
			</div>
		{/each}
	</div>
</div>
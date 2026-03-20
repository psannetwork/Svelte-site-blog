<script lang="ts">
	import { t, type Language } from '$lib/i18n';
	let { data } = $props();
	const lang = $derived((data.settings?.site_language || 'ja') as Language);
</script>

<svelte:head>
	<title>About | {data.settings?.site_title || 'Blog'}</title>
</svelte:head>

<!-- 編集ボタン (Admin のみ) -->
{#if data.user?.role === 'admin' || data.user?.role === 'editor'}
	<div class="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[9999]">
		<a
			href="/dashboard/pages/about"
			class="flex items-center gap-2 bg-psan-dark dark:bg-psan-green text-white dark:text-psan-green-fg px-4 py-2 md:px-6 md:py-3 rounded-full font-black shadow-2xl hover:scale-105 transition-all uppercase tracking-widest text-[10px] md:text-xs border-4 border-white dark:border-slate-900"
		>
			<svg class="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="3"
					d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
				/></svg
			>
			<span class="hidden md:inline">{t(lang, 'edit_page')}</span>
			<span class="md:hidden">Edit</span>
		</a>
	</div>
{/if}

<section class="py-24 md:py-40 transition-colors">
	<div class="max-w-7xl mx-auto px-4">
		<div class="prose dark:prose-invert max-w-4xl mx-auto">
			{@html data.aboutHtml}
		</div>
	</div>
</section>

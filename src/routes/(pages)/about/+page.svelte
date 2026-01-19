<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>About | {data.settings?.site_title || 'Blog'}</title>
</svelte:head>

<!-- 編集ボタン (Adminのみ) -->
{#if data.user?.role === 'admin' || data.user?.role === 'editor'}
	<div class="fixed bottom-8 right-8 z-[100]">
		<a
			href="/dashboard/pages/about"
			class="flex items-center gap-2 bg-psan-green text-psan-green-fg px-6 py-3 rounded-full font-black shadow-2xl hover:scale-105 transition-all uppercase tracking-widest text-xs border-4 border-white dark:border-slate-900"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="3"
					d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
				/></svg
			>
			Edit Page
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

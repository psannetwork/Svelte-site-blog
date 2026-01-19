<script lang="ts">
	let { children, data } = $props();
</script>

<!-- 認証ページはシンプルにヘッダーのみ -->
<header class="h-20 flex items-center justify-between px-8 absolute top-0 left-0 right-0 z-50">
	<a href="/" class="flex items-center gap-2">
		<div class="w-6 h-6 bg-psan-green rounded-lg shrink-0"></div>
		<span class="text-xl font-black tracking-tighter shrink-0 dark:text-white uppercase"
			>{data.settings?.site_title || 'PSANBLOG'}</span
		>
	</a>
	<a
		href="/"
		class="text-[10px] font-black tracking-widest opacity-70 hover:opacity-100 uppercase transition-all"
		>Back to Home</a
	>
</header>

<main class="flex-grow flex items-center justify-center">
	{@render children()}
</main>

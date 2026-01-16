<script lang="ts">
	import { page } from '$app/state';
	
	const status = $derived(page.status);
	const errorHtml = $derived(status === 404 ? page.data.error404Html : page.data.error500Html);
	const defaultMessage = $derived(status === 404 ? 'お探しのページは見つかりませんでした。' : 'サーバー内部でエラーが発生しました。');
</script>

<div class="min-h-[70vh] flex items-center justify-center px-4 py-20">
	<div class="max-w-4xl w-full">
		<div class="text-center mb-12">
			<h1 class="text-9xl font-black text-psan-green opacity-10">
				{status}
			</h1>
		</div>
		
		<div class="prose prose-slate dark:prose-invert mx-auto text-center">
			{#if errorHtml}
				{@html errorHtml}
			{:else}
				<h2 class="text-3xl font-black mb-4">{status === 404 ? '404 - Page Not Found' : '500 - Server Error'}</h2>
				<p class="text-lg opacity-60">{defaultMessage}</p>
			{/if}
		</div>

		<div class="mt-12 text-center">
			<a href="/" class="btn-psan-primary inline-flex px-10 py-4 font-black uppercase tracking-widest text-xs">Return Home</a>
		</div>
	</div>
</div>
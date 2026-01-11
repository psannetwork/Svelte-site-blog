<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="min-h-[70vh] flex items-center justify-center px-4 py-20">
	<div class="max-w-4xl w-full">
		<div class="text-center mb-12">
			<h1 class="text-9xl font-black text-psan-green opacity-10">
				{page.status}
			</h1>
		</div>
		
		<div class="prose prose-slate dark:prose-invert mx-auto text-center">
			{#if page.status === 404}
				{@html page.data.error404Html}
			{:else}
				{@html page.data.error500Html}
			{/if}
		</div>

		<div class="mt-12 text-center">
			<a href="/" class="btn-psan-primary inline-flex px-10 py-4">トップページへ戻る</a>
		</div>
	</div>
</div>
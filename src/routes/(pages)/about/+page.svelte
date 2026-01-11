<script lang="ts">
	let { data } = $props();
</script>

<section class="py-24 md:py-40 bg-white dark:bg-slate-900 transition-colors">
	<div class="max-w-7xl mx-auto px-4">
		<div class="prose prose-slate dark:prose-invert max-w-4xl mx-auto">
			{@html data.aboutHtml}
		</div>
	</div>
</section>
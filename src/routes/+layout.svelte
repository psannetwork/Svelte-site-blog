<script lang="ts">
	import "../app.css";
	import { onMount } from "svelte";
	import { theme } from "$lib/theme.svelte";
	let { children, data } = $props();

	onMount(() => {
		theme.init();
	});

	$effect(() => {
		if (data.settings?.accent_color) {
			document.documentElement.style.setProperty('--psan-green', data.settings.accent_color);
		}
	});
</script>

<div class="min-h-screen flex flex-col transition-colors duration-300">
	{@render children()}
</div>

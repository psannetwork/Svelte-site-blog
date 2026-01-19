<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { theme } from '$lib/theme.svelte';
	import { page } from '$app/state';
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

<svelte:head>
	<title
		>{page.data.pageTitle ? `${page.data.pageTitle} | ` : ''}{data.settings?.site_title ||
			'Svelte Site Blog'}</title
	>
	{#if data.settings?.site_description}
		<meta name="description" content={data.settings.site_description} />
	{/if}
	{#if data.settings?.site_icon_url}
		<link rel="icon" href="{data.settings.site_icon_url}" />
	{:else}
		<link rel="icon" href="/favicon.svg" />
	{/if}
	{#if data.settings?.custom_css}
		{@html `<style>${data.settings.custom_css}</style>`}
	{/if}
</svelte:head>

<div class="min-h-screen flex flex-col transition-colors duration-300">
	{@render children()}
</div>

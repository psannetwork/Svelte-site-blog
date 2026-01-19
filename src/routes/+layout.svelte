<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { theme } from '$lib/theme.svelte';
	import { page } from '$app/state';
	let { children, data } = $props();

	onMount(() => {
		theme.init();
	});

	function getContrastColor(hex: string, isDark: boolean) {
		if (!hex || hex.length < 6) return '#ffffff';
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		const yiq = (r * 299 + g * 587 + b * 114) / 1000;
		// ライトモードでは標準的な128、ダークモードではより白文字を優先するために180に設定
		const threshold = isDark ? 180 : 128;
		return yiq >= threshold ? '#000000' : '#ffffff';
	}

	$effect(() => {
		const color = data.settings?.accent_color || '#00cc99';
		const isDark = theme.current === 'dark';
		document.documentElement.style.setProperty('--psan-green', color);
		document.documentElement.style.setProperty('--accent-color', color);
		document.documentElement.style.setProperty('--psan-green-fg', getContrastColor(color, isDark));
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
		<link rel="icon" href={data.settings.site_icon_url} />
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

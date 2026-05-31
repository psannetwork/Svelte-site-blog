<script lang="ts">
	import { page } from '$app/state';
	import { theme } from '$lib/theme.svelte';
	import { onMount } from 'svelte';
	let { children, data } = $props();
	let isMenuOpen = $state(false);
	let hasUnreadNotifications = $state(false);
	let isSearchOpen = $state(false);
	let searchQuery = $state('');

	async function checkNotifications() {
		if (!data.user) return;
		try {
			const res = await fetch('/api/notifications');
			const result = await res.json();
			if (result.success) {
				hasUnreadNotifications = result.notifications.some((n: any) => !n.is_read);
			}
		} catch (e) {}
	}

	onMount(() => {
		if (data.user) {
			checkNotifications();

			const interval = setInterval(checkNotifications, 60000);
			return () => clearInterval(interval);
		}
	});

	$effect(() => {
		page.url.pathname;
		if (data.user) checkNotifications();
	});

	// メニュー項目のパース（安全に）
	let headerMenu = $derived.by(() => {
		let menu: { label: string; url: string }[] = [];
		try {
			menu = JSON.parse(
				data.settings?.header_menu ||
					JSON.stringify([
						{ label: 'Home', url: '/' },
						{ label: 'About', url: '/about' }
					])
			);
		} catch (e) {
			menu = [
				{ label: 'Home', url: '/' },
				{ label: 'About', url: '/about' }
			];
		}
		if (data.navFooterPages) {
			data.navFooterPages.forEach((p: any) => {
				if (Number(p.show_in_nav) === 1) {
					menu.push({ label: p.title, url: `/${p.id}` });
				}
			});
		}
		return menu;
	});

	let footerMenu = $derived.by(() => {
		let menu: { label: string; url: string }[] = [];
		try {
			menu = JSON.parse(
				data.settings?.footer_menu ||
					JSON.stringify([
						{ label: 'Home', url: '/' },
						{ label: 'About', url: '/about' },
						{ label: 'Privacy', url: '/privacy' }
					])
			);
		} catch (e) {
			menu = [
				{ label: 'Home', url: '/' },
				{ label: 'About', url: '/about' },
				{ label: 'Privacy', url: '/privacy' }
			];
		}
		if (data.navFooterPages) {
			data.navFooterPages.forEach((p: any) => {
				if (Number(p.show_in_footer) === 1) {
					menu.push({ label: p.title, url: `/${p.id}` });
				}
			});
		}
		return menu;
	});

	function handleSearch(e: Event) {
		e.preventDefault();
		if (searchQuery.trim()) {
			isSearchOpen = false;
			window.location.href = `/?search=${encodeURIComponent(searchQuery.trim())}`;
		}
		searchQuery = '';
	}

	// URL から検索クエリを取得して保持
	$effect(() => {
		const params = new URLSearchParams(page.url.search);
		const search = params.get('search');
		if (search) {
			searchQuery = search;
			isSearchOpen = true;
		} else {
			searchQuery = '';
			isSearchOpen = false;
		}
	});
</script>

<svelte:head></svelte:head>

<header
	class="bg-[--bg-main]/90 backdrop-blur-md sticky top-0 z-50 border-b border-[--border-color] transition-colors"
>
	<nav class="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
		<div class="flex items-center gap-8">
			<a href="/" class="flex items-center gap-2 group">
				<div class="w-8 h-8 bg-psan-green rounded-lg"></div>
				<span class="text-2xl font-black tracking-tighter uppercase"
					>{data.settings?.site_title || 'PSANBLOG'}</span
				>
			</a>
			<div
				class="hidden md:flex items-center gap-8 text-xs font-black opacity-70 uppercase tracking-widest"
			>
				{#each headerMenu as item}
					<a
						href={item.url}
						class="hover:text-psan-green hover:opacity-100 transition-all {page.url.pathname ===
						item.url
							? 'opacity-100 text-psan-green'
							: ''}">{item.label}</a
					>
				{/each}
			</div>
		</div>

		<div class="flex items-center gap-2 md:gap-4">
			<button
				onclick={() => (isSearchOpen = !isSearchOpen)}
				class="relative p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:scale-110 transition-all text-slate-600 dark:text-slate-300 hover:bg-psan-green hover:text-white group"
				aria-label="検索"
			>
				<svg class="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg
				>
				<span class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-psan-pink rounded-full border-2 border-[--bg-main]"></span>
			</button>

			<button
				onclick={() => theme.toggle()}
				class="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:scale-110 transition-all text-slate-600 dark:text-yellow-400"
				aria-label="テーマ切替"
			>
				{#if theme.current === 'light'}
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"
						><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg
					>
				{:else}
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"
						><path
							d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464l-.707-.707a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414zm2.12 10.607a1 1 0 010-1.414l.706-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
						/></svg
					>
				{/if}
			</button>

			<div class="hidden md:flex items-center gap-6">
				{#if data.user}
					<a href="/account" class="flex items-center gap-3 group relative">
						<div
							class="w-10 h-10 rounded-2xl bg-psan-green overflow-hidden shadow-lg shadow-psan-green/20 group-hover:scale-110 transition-transform"
						>
							{#if data.user.avatar_url}
								<img src={data.user.avatar_url} alt="" class="w-full h-full object-cover" />
							{:else}
								<div
									class="w-full h-full flex items-center justify-center text-psan-green-fg font-black uppercase text-sm"
								>
									{(data.user.nickname || data.user.username).substring(0, 1)}
								</div>
							{/if}
						</div>
						{#if hasUnreadNotifications}
							<span
								class="absolute -top-1 -right-1 w-4 h-4 bg-psan-pink border-4 border-[--bg-main] rounded-full animate-bounce"
							></span>
						{/if}
					</a>
					{#if ['admin', 'editor', 'author'].includes(data.user.role)}
						<a
							href="/dashboard"
							class="text-xs font-black opacity-70 hover:opacity-100 uppercase tracking-widest"
							>Dashboard</a
						>
					{/if}
					<form action="/auth/logout" method="POST">
						<button class="text-xs font-black text-psan-pink uppercase tracking-widest"
							>Logout</button
						>
					</form>
				{:else}
					<a
						href="/auth/login"
						class="text-xs font-black opacity-70 hover:opacity-100 uppercase tracking-widest"
						>Login</a
					>
					{#if String(data.settings?.allow_signup) === 'true'}
						<a href="/auth/register" class="btn-psan-primary py-2 px-6 text-[10px]">SIGN UP</a>
					{/if}
				{/if}
			</div>

			<button
				onclick={() => (isMenuOpen = !isMenuOpen)}
				class="md:hidden p-2 text-main"
				aria-label="メニュー"
				><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path d="M4 6h16M4 12h16m-7 6h7" /></svg
				></button
			>
		</div>
	</nav>

	{#if isMenuOpen}
		<div
			class="md:hidden bg-[--bg-main]/98 dark:bg-slate-900/98 backdrop-blur-2xl border-b border-[--border-color] p-6 space-y-6 fixed top-20 left-0 w-full z-40 shadow-2xl max-h-[calc(100vh-5rem)] overflow-y-auto"
		>
			<div class="flex flex-col gap-4">
				{#each headerMenu as item}
					<a href={item.url} class="block font-black text-lg py-2 hover:text-psan-green transition-colors">{item.label}</a>
				{/each}
			</div>
			<hr class="opacity-10 my-4" />
			<div class="flex flex-col gap-4">
			{#if data.user}
				<a href="/account" class="block font-black text-lg py-2">ACCOUNT</a>
				{#if ['admin', 'editor', 'author'].includes(data.user.role)}
					<a href="/dashboard" class="block font-black text-lg py-2 text-psan-green">DASHBOARD</a>
				{/if}
				<form action="/auth/logout" method="POST">
					<button class="font-black text-lg text-psan-pink py-2">LOGOUT</button>
				</form>
			{:else}
				<a href="/auth/login" class="block font-black text-lg py-2">LOGIN</a>
				{#if String(data.settings?.allow_signup) === 'true'}
					<a href="/auth/register" class="block font-black text-lg py-2 text-psan-green">SIGN UP</a>
				{/if}
			{/if}
			</div>
		</div>
	{/if}
</header>

<!-- 検索モーダル (ヘッダーの外に配置) -->
{#if isSearchOpen}
	<div
		role="presentation"
		class="fixed inset-0 bg-black/30 dark:bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
		onclick={() => {
			isSearchOpen = false;
			searchQuery = '';
			window.history.pushState({}, '', '/');
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				isSearchOpen = false;
				searchQuery = '';
				window.history.pushState({}, '', '/');
			}
		}}
		tabindex="0"
	>
		<div
			role="dialog"
			aria-modal="true"
			onclick={(e) => e.stopPropagation()}
			class="w-full max-w-3xl bg-[--bg-main] rounded-[2rem] shadow-2xl overflow-hidden transform transition-all translate-y-0"
		>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					const query = searchQuery.trim();
					if (query) {
						isSearchOpen = false;
						window.location.href = `/?search=${encodeURIComponent(query)}`;
					}
				}}
				class="flex items-center justify-between gap-4 p-4 md:p-6 border-b border-[--border-color] bg-slate-50/50 dark:bg-slate-800/50"
			>
				<div class="flex items-center gap-4 flex-1">
					<svg class="w-6 h-6 md:w-8 md:h-8 text-psan-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg
					>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="記事を検索..."
						class="flex-1 bg-transparent border-none text-lg md:text-xl font-bold focus:ring-0 p-0 text-main placeholder:text-muted/40 outline-none"
					/>
				</div>
				<button
					type="submit"
					class="btn-psan-primary py-3 px-6 md:px-8 text-sm md:text-base shrink-0 rounded-2xl shadow-lg"
				>
					検索
				</button>
				<button
					type="button"
					onclick={() => {
						isSearchOpen = false;
						searchQuery = '';
						window.history.pushState({}, '', '/');
					}}
					class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-muted hover:text-psan-pink shrink-0"
					aria-label="閉じる"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg
					>
				</button>
			</form>
			<div class="p-4 md:p-6 bg-slate-50 dark:bg-slate-900/50">
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-[10px] font-black text-muted uppercase tracking-widest">🔥 人気タグ:</span>
					<button type="button" onclick={() => { isSearchOpen = false; window.location.href = '/?search=技術'; }} class="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-full text-xs font-bold hover:bg-psan-green hover:text-white transition-all shadow-sm">技術</button>
					<button type="button" onclick={() => { isSearchOpen = false; window.location.href = '/?search=デザイン'; }} class="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-full text-xs font-bold hover:bg-psan-green hover:text-white transition-all shadow-sm">デザイン</button>
					<button type="button" onclick={() => { isSearchOpen = false; window.location.href = '/?search=チュートリアル'; }} class="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-full text-xs font-bold hover:bg-psan-green hover:text-white transition-all shadow-sm">チュートリアル</button>
					<button type="button" onclick={() => { isSearchOpen = false; window.location.href = '/?search=Svelte'; }} class="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-full text-xs font-bold hover:bg-psan-green hover:text-white transition-all shadow-sm">Svelte</button>
					<button type="button" onclick={() => { isSearchOpen = false; window.location.href = '/?search=UI'; }} class="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-full text-xs font-bold hover:bg-psan-green hover:text-white transition-all shadow-sm">UI</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<main class="flex-grow">
	{@render children()}
</main>

<footer class="bg-[--bg-secondary] py-12 md:py-20 px-4 transition-colors">
	<div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 md:gap-12">
		<div class="space-y-4 text-center md:text-left">
			<div class="flex items-center justify-center md:justify-start gap-2">
				<div class="w-6 h-6 bg-psan-green rounded shadow-lg shadow-psan-green/20"></div>
				<span class="text-[--text-main] font-black tracking-tighter text-2xl uppercase"
					>{data.settings?.site_title || 'PSANBLOG'}</span
				>
			</div>
			<p class="text-[10px] font-black tracking-[0.3em] text-main uppercase">
				© 2026 PSANNETWORK ALL RIGHTS RESERVED.
			</p>
		</div>

		<div
			class="flex flex-wrap justify-center gap-10 text-[10px] font-black tracking-[0.2em] uppercase"
		>
			{#each footerMenu as item}
				<a
					href={item.url}
					class="text-main hover:text-psan-green transition-colors {page.url.pathname ===
					item.url
						? 'text-psan-green'
						: ''}">{item.label}</a
				>
			{/each}
			
			{#if String(data.settings?.show_footer_auth) === 'true'}
				{#if data.user}
					<form action="/auth/logout" method="POST" class="inline">
						<button class="text-psan-pink hover:opacity-80 transition-colors uppercase">Logout</button>
					</form>
				{:else}
					<a href="/auth/login" class="text-main hover:text-psan-green transition-colors">Login</a>
				{/if}
			{/if}
		</div>
	</div>
</footer>

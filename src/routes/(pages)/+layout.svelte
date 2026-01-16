<script lang="ts">
	import { page } from "$app/state";
	import { theme } from "$lib/theme.svelte";
	import { onMount } from "svelte";
	let { children, data } = $props();
	let isMenuOpen = $state(false);
	let hasUnreadNotifications = $state(false);

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
			// 1分ごとにチェック
			const interval = setInterval(checkNotifications, 60000);
			return () => clearInterval(interval);
		}
	});

	$effect(() => {
		// ページ遷移時にもチェック
		page.url.pathname;
		if (data.user) checkNotifications();
	});
</script>

<header class="bg-[--bg-main]/70 backdrop-blur-xl sticky top-0 z-50 border-b border-[--border-color] transition-colors">
	<nav class="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
		<div class="flex items-center gap-8">
			<a href="/" class="flex items-center gap-2 group">
				<div class="w-8 h-8 bg-psan-green rounded-lg"></div>
				<span class="text-2xl font-black tracking-tighter uppercase">{data.settings?.site_title || 'PSANBLOG'}</span>
			</a>
			<div class="hidden md:flex items-center gap-8 text-xs font-black opacity-40 uppercase tracking-widest">
				<a href="/" class="hover:text-psan-green hover:opacity-100 transition-all {page.url.pathname === '/' ? 'opacity-100 text-psan-green' : ''}">Home</a>
				<a href="/about" class="hover:text-psan-green hover:opacity-100 transition-all {page.url.pathname === '/about' ? 'opacity-100 text-psan-green' : ''}">About</a>
			</div>
		</div>
		
		<div class="flex items-center gap-4">
			<button onclick={() => theme.toggle()} class="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:scale-110 transition-all text-slate-600 dark:text-yellow-400" aria-label="テーマ切替">
				{#if theme.current === 'light'}
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
				{:else}
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464l-.707-.707a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414zm2.12 10.607a1 1 0 010-1.414l.706-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg>
				{/if}
			</button>

			<div class="hidden md:flex items-center gap-6">
				{#if data.user}
					<a href="/account" class="flex items-center gap-3 group relative">
						<div class="w-10 h-10 rounded-2xl bg-psan-green overflow-hidden shadow-lg shadow-psan-green/20 group-hover:scale-110 transition-transform">
							{#if data.user.avatar_url}
								<img src={data.user.avatar_url} alt="" class="w-full h-full object-cover" />
							{:else}
								<div class="w-full h-full flex items-center justify-center text-white font-black uppercase text-sm">
									{(data.user.nickname || data.user.username).substring(0,1)}
								</div>
							{/if}
						</div>
						{#if hasUnreadNotifications}
							<span class="absolute -top-1 -right-1 w-4 h-4 bg-psan-pink border-4 border-[--bg-main] rounded-full animate-bounce"></span>
						{/if}
					</a>
					{#if data.user.role === 'admin' || data.user.role === 'editor'}
						<a href="/dashboard" class="text-xs font-black opacity-40 hover:opacity-100 uppercase tracking-widest">Dashboard</a>
					{/if}
					<form action="/auth/logout" method="POST"><button class="text-xs font-black text-psan-pink uppercase tracking-widest">Logout</button></form>
				{:else}
					<a href="/auth/login" class="text-xs font-black opacity-40 hover:opacity-100 uppercase tracking-widest">Login</a>
					{#if data.settings?.allow_signup === 'true'}
						<a href="/auth/register" class="btn-psan-primary py-2 px-6 text-[10px]">SIGN UP</a>
					{/if}
				{/if}
			</div>

			<button onclick={() => isMenuOpen = !isMenuOpen} class="md:hidden p-2" aria-label="メニュー"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16m-7 6h7"/></svg></button>
		</div>
	</nav>

	{#if isMenuOpen}
		<div class="md:hidden bg-[--bg-main] border-b border-[--border-color] p-6 space-y-6">
			<a href="/" class="block font-black text-xl">HOME</a>
			<a href="/about" class="block font-black text-xl">ABOUT</a>
			<hr class="opacity-10" />
			{#if data.user}
				<a href="/account" class="block font-black">ACCOUNT</a>
				{#if data.user.role === 'admin' || data.user.role === 'editor'}
					<a href="/dashboard" class="block font-black text-psan-green">DASHBOARD</a>
				{/if}
				<form action="/auth/logout" method="POST"><button class="font-black text-psan-pink">LOGOUT</button></form>
			{:else}
				<a href="/auth/login" class="block font-black">LOGIN</a>
				<a href="/auth/register" class="block font-black text-psan-green">SIGN UP</a>
			{/if}
		</div>
	{/if}
</header>

<main class="flex-grow">
	{@render children()}
</main>

<footer class="bg-[--bg-secondary] text-muted py-20 px-4 transition-colors">
	<div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
		<div class="space-y-4 text-center md:text-left">
			<div class="flex items-center justify-center md:justify-start gap-2">
				<div class="w-6 h-6 bg-psan-green rounded shadow-lg shadow-psan-green/20"></div>
				<span class="text-[--text-main] font-black tracking-tighter text-2xl uppercase">{data.settings?.site_title || 'PSANBLOG'}</span>
			</div>
			<p class="text-[10px] font-black tracking-[0.3em] opacity-30 uppercase">© 2026 PSANNETWORK ALL RIGHTS RESERVED.</p>
		</div>

		<div class="flex flex-wrap justify-center gap-10 text-[10px] font-black tracking-[0.2em] uppercase">
			<a href="/" class="hover:text-psan-green transition-colors">Home</a>
			<a href="/about" class="hover:text-psan-green transition-colors">About</a>
			<a href="/privacy" class="hover:text-psan-green transition-colors">Privacy</a>
		</div>
	</div>
</footer>
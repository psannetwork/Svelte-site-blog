<script lang="ts">
	import "../app.css";
	import { onMount } from "svelte";
	let { children, data } = $props();
	
	let isDark = $state(false);
	let isMenuOpen = $state(false);

	onMount(() => {
		const saved = localStorage.getItem('theme');
		if (saved) {
			isDark = saved === 'dark';
		} else {
			isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		}
		// 初期反映
		apply();
	});

	function apply() {
		if (isDark) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}

	function toggleTheme() {
		isDark = !isDark;
		apply();
	}
</script>

<div class="min-h-screen flex flex-col transition-colors duration-300">
	<header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800">
		<nav class="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
			<div class="flex items-center gap-8">
				<a href="/" class="flex items-center gap-2 group">
					<div class="w-8 h-8 bg-psan-green rounded-lg"></div>
					<span class="text-2xl font-black tracking-tighter">{data.settings?.site_title || 'PSANBLOG'}</span>
				</a>
				<div class="hidden md:flex items-center gap-8 text-xs font-black opacity-40 uppercase tracking-widest">
					<a href="/" class="hover:text-psan-green hover:opacity-100 transition-all">Home</a>
					<a href="/about" class="hover:text-psan-green hover:opacity-100 transition-all">About</a>
				</div>
			</div>
			
			<div class="flex items-center gap-4">
				<button onclick={toggleTheme} class="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:scale-110 transition-all" aria-label="テーマ切替">
					{#if isDark}
						<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464l-.707-.707a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414zm2.12 10.607a1 1 0 010-1.414l.706-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg>
					{:else}
						<svg class="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
					{/if}
				</button>

				<div class="hidden md:flex items-center gap-6">
					{#if data.user}
						<a href="/account" class="text-xs font-black opacity-40 hover:opacity-100 uppercase tracking-widest">Account</a>
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
			<div class="md:hidden bg-white dark:bg-slate-900 border-b dark:border-slate-800 p-6 space-y-6 animate-in slide-in-from-top duration-300">
				<a href="/" class="block font-black text-xl">HOME</a>
				<a href="/about" class="block font-black text-xl">ABOUT</a>
				<hr class="opacity-10" />
				{#if data.user}
					<a href="/account" class="block font-black">ACCOUNT</a>
					<a href="/dashboard" class="block font-black text-psan-green">DASHBOARD</a>
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

	<footer class="bg-slate-900 text-slate-500 py-20 px-4 mt-auto">
		<div class="max-w-7xl mx-auto text-center space-y-8">
			<div class="flex items-center justify-center gap-2">
				<div class="w-6 h-6 bg-psan-green rounded shadow-lg shadow-psan-green/20"></div>
				<span class="text-white font-black tracking-tighter text-2xl uppercase">{data.settings?.site_title || 'PSANNETWORK'}</span>
			</div>
			<p class="text-[10px] font-black tracking-[0.3em] opacity-30 uppercase">© 2026 PSANNETWORK ALL RIGHTS RESERVED.</p>
		</div>
	</footer>
</div>
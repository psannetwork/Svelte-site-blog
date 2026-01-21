<script lang="ts">
	import { theme } from '$lib/theme.svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { t, type Language } from '$lib/i18n';
	let { children, data } = $props();

	let isSidebarOpen = $state(false);
	const lang = $derived((data.settings?.site_language || 'ja') as Language);

	const menuItems = $derived([
		{
			name: t(lang, 'overview'),
			href: '/dashboard',
			icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
		},
		{
			name: t(lang, 'pages'),
			href: '/dashboard/pages',
			icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
			adminOnly: true
		},
		{
			name: t(lang, 'posts'),
			href: '/dashboard/posts',
			icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
		},
		{
			name: t(lang, 'comments'),
			href: '/dashboard/comments',
			icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
			adminOnly: true
		},
		{
			name: t(lang, 'users'),
			href: '/dashboard/users',
			icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
			adminOnly: true
		},
		{
			name: t(lang, 'settings'),
			href: '/dashboard/settings',
			icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
			adminOnly: true
		}
	]);

	// Mobile bottom nav items (Top 4)
	const mobileItems = $derived(menuItems.slice(0, 4));

	$effect(() => {
		page.url.pathname;
		isSidebarOpen = false;
	});
</script>

<svelte:head>
	{#if data.settings?.accent_color}
		<style>
			:root {
				--accent-color: {data.settings.accent_color} !important;
			}
		</style>
	{/if}
</svelte:head>

<div class="flex h-screen bg-slate-50 dark:bg-[#0b0f1a] transition-colors overflow-hidden font-sans">
	<!-- DESKTOP SIDEBAR: Floating Style -->
	<aside class="hidden lg:flex flex-col w-80 p-6 shrink-0">
		<div class="flex-1 card-dashboard flex flex-col shadow-2xl shadow-psan-green/5">
			<div class="p-8">
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 rounded-2xl bg-psan-green shadow-lg shadow-psan-green/30 flex items-center justify-center text-white">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
					</div>
					<div>
						<span class="block font-black text-xl tracking-tighter text-main uppercase leading-none">Psan</span>
						<span class="text-[9px] font-black uppercase tracking-[0.3em] text-psan-green">Console</span>
					</div>
				</div>
			</div>

			<nav class="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
				{#each menuItems as item}
					{@const isDisabled = item.adminOnly && (data.user?.role === 'editor' || data.user?.role === 'author')}
					{@const isActive = page.url.pathname === item.href}
					<a
						href={isDisabled ? 'javascript:void(0)' : item.href}
						class="flex items-center gap-4 px-6 py-4 rounded-[24px] font-black text-xs transition-all duration-300 group
						{isDisabled
							? 'opacity-20 grayscale cursor-not-allowed'
							: isActive
								? 'bg-psan-green text-white shadow-xl shadow-psan-green/20'
								: 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-psan-green dark:hover:text-white'}"
					>
						<svg class="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}/></svg>
						{item.name}
						{#if isActive}
							<div class="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
						{/if}
					</a>
				{/each}
			</nav>

			<div class="p-6 mt-auto">
				<div class="bg-slate-100 dark:bg-slate-800/50 rounded-3xl p-4 flex items-center gap-4">
					<div class="w-10 h-10 rounded-xl bg-psan-green/20 flex items-center justify-center text-psan-green">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
					</div>
					<div class="min-w-0">
						<div class="text-[10px] font-black text-main truncate uppercase">{data.user?.nickname || data.user?.username}</div>
						<div class="text-[8px] font-black text-psan-green uppercase tracking-widest">{data.user?.role}</div>
					</div>
				</div>
			</div>
		</div>
	</aside>

	<!-- MAIN AREA -->
	<div class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
		<!-- HEADER -->
		<header class="h-24 px-6 md:px-12 flex items-center justify-between shrink-0 z-40">
			<div class="flex items-center gap-6">
				<div class="lg:hidden flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-psan-green flex items-center justify-center text-white shadow-lg shadow-psan-green/20">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
					</div>
					<span class="font-black text-lg tracking-tighter text-main uppercase">{t(lang, 'dashboard')}</span>
				</div>
				<div class="hidden lg:flex items-center gap-2 px-6 py-2 bg-white dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm">
					<span class="w-2 h-2 rounded-full bg-psan-green animate-pulse"></span>
					<span class="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{t(lang, 'system_online')}</span>
				</div>
			</div>

			<div class="flex items-center gap-4 md:gap-6">
				<button
					onclick={() => theme.toggle()}
					class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-psan-green shadow-sm"
				>
					{#if theme.current === 'light'}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
					{:else}
						<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
					{/if}
				</button>
				<a
					href="/account"
					class="w-12 h-12 rounded-2xl overflow-hidden bg-psan-green text-white shadow-lg shadow-psan-green/20 flex items-center justify-center font-black group transition-transform active:scale-90"
				>
					{#if data.user?.avatar_url}
						<img src={data.user.avatar_url} alt="" class="w-full h-full object-cover group-hover:scale-110 transition-transform" />
					{:else}
						{(data.user?.nickname || data.user?.username).substring(0, 1).toUpperCase()}
					{/if}
				</a>
			</div>
		</header>

		<!-- CONTENT -->
		<main class="flex-1 overflow-y-auto px-6 md:px-12 pb-32 pt-4 custom-scrollbar overflow-x-hidden">
			<div class="max-w-7xl mx-auto">
				{@render children()}
			</div>
		</main>

		<!-- MOBILE BOTTOM NAV -->
		<nav class="lg:hidden fixed bottom-6 left-6 right-6 h-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-[32px] shadow-2xl z-50 flex items-center justify-around px-4">
			{#each mobileItems as item}
				{@const isActive = page.url.pathname === item.href}
				<a
					href={item.href}
					class="flex flex-col items-center justify-center gap-1 transition-all
					{isActive ? 'text-psan-green scale-110' : 'text-slate-500 dark:text-slate-600'}"
				>
					<div class="w-10 h-10 rounded-2xl flex items-center justify-center transition-all {isActive ? 'bg-psan-green/10' : ''}">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}/></svg>
					</div>
					<span class="text-[8px] font-black uppercase tracking-widest">{item.name}</span>
				</a>
			{/each}
			<!-- Quick Profile -->
			<a
				href="/account"
				class="flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-slate-600"
			>
				<div class="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
					{#if data.user?.avatar_url}
						<img src={data.user.avatar_url} alt="" class="w-full h-full object-cover" />
					{:else}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
					{/if}
				</div>
				<span class="text-[8px] font-black uppercase tracking-widest">Me</span>
			</a>
		</nav>
	</div>
</div>

<style>
	@reference "tailwindcss";

	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		@apply bg-slate-200/50 dark:bg-slate-800/50 rounded-full;
	}
</style>
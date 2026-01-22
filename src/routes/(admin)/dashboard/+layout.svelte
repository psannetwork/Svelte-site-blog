<script lang="ts">
	import '../../../app.css';
	import { page } from '$app/state';
	import { t, type Language } from '$lib/i18n';
	import { theme } from '$lib/theme.svelte';

	let { data, children } = $props();
	const lang = $derived((data.settings?.site_language || 'ja') as Language);

	const menuItems = $derived([
		{
			name: t(lang, 'overview'),
			href: '/dashboard',
			icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
		},
		{
			name: t(lang, 'posts'),
			href: '/dashboard/posts',
			icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
		},
		{
			name: t(lang, 'pages'),
			href: '/dashboard/pages',
			icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
		},
		{
			name: t(lang, 'comments'),
			href: '/dashboard/comments',
			icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'
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

	const mobileItems = $derived(menuItems.slice(0, 4));

	$effect(() => {
		if (typeof window !== 'undefined') {
			document.documentElement.classList.toggle('dark', theme.current === 'dark');
		}
	});
</script>

<div class="min-h-screen bg-white dark:bg-slate-950 flex transition-colors duration-500">
	<!-- Sidebar (Desktop) -->
	<aside class="hidden lg:flex w-80 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex-col sticky top-0 h-screen z-50 transition-all duration-500 shadow-2xl shadow-slate-200/50 dark:shadow-none">
		<div class="p-10">
			<div class="flex items-center gap-4 mb-10">
				<div class="w-12 h-12 bg-psan-green rounded-2xl rotate-12 flex items-center justify-center text-white shadow-lg shadow-psan-green/20">
					<svg class="w-7 h-7 -rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
				</div>
				<div>
					<h1 class="text-xl font-black tracking-tighter text-main italic">PSAN</h1>
					<p class="text-[8px] font-black text-psan-green uppercase tracking-widest">{t(lang, 'admin_console')}</p>
				</div>
			</div>

			<a href="/" data-sveltekit-reload class="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-400 hover:text-psan-green transition-colors group">
				<svg class="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
				<span class="text-[10px] font-black uppercase tracking-widest">{t(lang, 'home_page')}</span>
			</a>
		</div>

		<nav class="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
			{#each menuItems as item}
				{@const isActive = page.url.pathname === item.href || (item.href !== '/dashboard' && page.url.pathname.startsWith(item.href))}
				{@const isDisabled = item.adminOnly && data.user?.role !== 'admin'}
				
				<a
					href={isDisabled ? 'javascript:void(0)' : item.href}
					class="flex items-center gap-4 px-6 py-4 rounded-[24px] font-black text-xs transition-all duration-300 group
					{isDisabled
						? 'opacity-20 grayscale cursor-not-allowed'
						: isActive
							? 'bg-psan-green text-white shadow-xl shadow-psan-green/20'
							: 'text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-psan-green dark:hover:text-white'}"
				>
					<div class="shrink-0">
						<svg class="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d={item.icon}/>
						</svg>
					</div>
					<span class="uppercase tracking-widest">{item.name}</span>
					{#if isActive}
						<div class="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>
					{/if}
				</a>
			{/each}
		</nav>

		<!-- LATEST TALK PREVIEW (NEW!) -->
		{#if data.latestComments && data.latestComments.length > 0}
			<div class="px-8 mb-6 mt-10">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-[10px] font-black text-muted uppercase tracking-[0.2em]">{t(lang, 'latest_talk')}</h3>
					<div class="w-1 h-1 rounded-full bg-psan-pink animate-pulse"></div>
				</div>
				<div class="space-y-4">
					{#each data.latestComments as comment}
						<div class="group/talk cursor-default">
							<div class="flex items-center gap-2 mb-1">
								<span class="text-[9px] font-black text-main uppercase truncate max-w-[100px]">{comment.author_name}</span>
								<span class="text-[8px] font-bold text-muted opacity-50">{new Date(comment.created_at).toLocaleDateString()}</span>
							</div>
							<p class="text-[10px] font-bold text-muted line-clamp-1 leading-tight group-hover/talk:text-psan-pink transition-colors">
								{comment.content}
							</p>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<div class="p-6 mt-auto">
			<div class="bg-slate-100 dark:bg-slate-800/50 rounded-3xl p-4 flex items-center gap-4">
				<div class="w-10 h-10 rounded-xl bg-psan-green/20 flex items-center justify-center text-psan-green font-black">
					{#if data.user?.avatar_url}
						<img src={data.user.avatar_url} alt="" class="w-full h-full object-cover rounded-xl" />
					{:else}
						{(data.user?.nickname || data.user?.username).substring(0, 1).toUpperCase()}
					{/if}
				</div>
				<div class="min-w-0">
					<div class="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate uppercase">{data.user?.nickname || data.user?.username}</div>
					<div class="text-[8px] font-black text-psan-green uppercase tracking-widest">{data.user?.role}</div>
				</div>
			</div>
		</div>
	</aside>

	<!-- Mobile Nav -->
	<div class="lg:hidden fixed bottom-6 left-6 right-6 h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-[32px] flex items-center justify-around px-4 z-50 shadow-2xl">
		<a href="/" data-sveltekit-reload class="p-3 text-slate-400">
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
		</a>
		{#each mobileItems as item}
			{@const isActive = page.url.pathname === item.href}
			<a href={item.href} class="p-4 transition-all relative {isActive ? 'text-psan-green scale-110' : 'text-slate-400'}">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d={item.icon}/></svg>
				{#if isActive}
					<div class="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-psan-green rounded-full"></div>
				{/if}
			</a>
		{/each}
		<a href="/dashboard/settings" class="p-3 text-slate-400 {page.url.pathname === '/dashboard/settings' ? 'text-psan-green' : ''}">
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.754 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM12 15a3 3 0 100-6 3 3 0 000 6z"/></svg>
		</a>
	</div>

	<main class="flex-1 min-w-0 pb-32 lg:pb-0">
		<div class="p-6 md:p-12">
			{@render children()}
		</div>
	</main>
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
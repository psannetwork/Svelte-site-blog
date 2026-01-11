<script lang="ts">
	import { theme } from "$lib/theme.svelte";
	import { page } from "$app/state";
	let { children, data } = $props();
	
	let isSidebarOpen = $state(false);

	const menuItems = [
		{ name: '概要', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
		{ name: '投稿管理', href: '/dashboard/posts', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
		{ name: 'コメント', href: '/dashboard/comments', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
		{ name: 'ユーザー', href: '/dashboard/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
		{ name: '設定', href: '/dashboard/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
	];

	// ページ遷移時にサイドバーを閉じる
	$effect(() => {
		page.url.pathname;
		isSidebarOpen = false;
	});
</script>

<div class="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden">
	<!-- モバイル用オーバーレイ -->
	{#if isSidebarOpen}
		<button 
			onclick={() => isSidebarOpen = false} 
			class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] lg:hidden animate-in fade-in duration-300"
			aria-label="サイドバーを閉じる"
		></button>
	{/if}

	<!-- サイドバー (レスポンシブ) -->
	<aside class="
		fixed lg:static inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
		z-[101] lg:z-0 transform transition-transform duration-300 ease-in-out shrink-0 flex flex-col
		{isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
	">
		<div class="p-8 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 bg-psan-green rounded-lg shrink-0"></div>
				<span class="font-black text-xl tracking-tighter dark:text-white uppercase">Dashboard</span>
			</div>
			<button onclick={() => isSidebarOpen = false} class="lg:hidden p-2 text-slate-400">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
			</button>
		</div>
		
		<nav class="flex-1 px-4 space-y-1 overflow-y-auto">
			{#each menuItems as item}
				<a href={item.href} class="flex items-center gap-3 px-4 py-4 lg:py-3 rounded-2xl font-bold text-sm lg:text-xs transition-all 
					{page.url.pathname === item.href ? 'bg-psan-green/10 text-psan-green' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}/></svg>
					{item.name}
				</a>
			{/each}
		</nav>

		<div class="p-6 border-t dark:border-slate-800">
			<a href="/" class="flex items-center justify-center gap-2 py-4 lg:py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-[10px] font-black tracking-widest hover:bg-psan-green hover:text-white transition-all">
				VIEW PUBLIC SITE
			</a>
		</div>
	</aside>

	<div class="flex-1 flex flex-col min-w-0 overflow-hidden">
		<!-- ダッシュボード用ヘッダー -->
		<header class="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between shrink-0">
			<div class="flex items-center gap-4">
				<button onclick={() => isSidebarOpen = true} class="lg:hidden p-2 bg-slate-100 dark:bg-slate-800 rounded-xl" aria-label="メニュー">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
				</button>
				<h1 class="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase hidden sm:block">Admin Console</h1>
			</div>
			
			<div class="flex items-center gap-3 md:gap-6">
				<button onclick={() => theme.toggle()} class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800" aria-label="テーマ切替">
					{#if theme.current === 'light'}
						<svg class="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
					{:else}
						<svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464l-.707-.707a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414zm2.12 10.607a1 1 0 010-1.414l.706-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg>
					{/if}
				</button>
				<a href="/account" class="flex items-center gap-3 sm:pl-6 sm:border-l dark:border-slate-800 group transition-all shrink-0">
					<div class="text-right hidden md:block">
						<div class="text-[10px] font-black tracking-tighter dark:text-white leading-none mb-1 group-hover:text-psan-green uppercase">{data.user?.nickname || data.user?.username}</div>
						<div class="text-[8px] font-black text-psan-green uppercase tracking-widest">{data.user?.role}</div>
					</div>
					<div class="w-10 h-10 rounded-2xl bg-psan-green overflow-hidden flex items-center justify-center font-black text-white shadow-lg shadow-psan-green/20 group-hover:scale-110 transition-transform">
						{#if data.user?.avatar_url}
							<img src={data.user.avatar_url} alt="" class="w-full h-full object-cover" />
						{:else}
							{(data.user?.nickname || data.user?.username).substring(0,1).toUpperCase()}
						{/if}
					</div>
				</a>
			</div>
		</header>

		<!-- メインコンテンツ -->
		<main class="flex-1 overflow-y-auto p-4 md:p-12 pb-32">
			{@render children()}
		</main>
	</div>
</div>

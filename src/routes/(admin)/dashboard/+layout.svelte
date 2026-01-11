<script lang="ts">
	let { children, data } = $props();
	const menuItems = [
		{ name: 'ダッシュボード', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
		{ name: '投稿管理', href: '/dashboard/posts', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
		{ name: 'コメント', href: '/dashboard/comments', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
		{ name: 'ユーザー管理', href: '/dashboard/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
		{ name: 'サイト設定', href: '/dashboard/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
	];
</script>

<div class="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
	<!-- サイドバー -->
	<aside class="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden lg:flex flex-col">
		<div class="p-8 flex items-center gap-3">
			<div class="w-8 h-8 bg-psan-green rounded-lg"></div>
			<span class="font-black text-xl tracking-tighter">DASHBOARD</span>
		</div>
		<nav class="flex-1 px-4 space-y-2">
			{#each menuItems as item}
				<a href={item.href} class="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-psan-green">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}/></svg>
					{item.name}
				</a>
			{/each}
		</nav>
		<div class="p-8 border-t dark:border-slate-800">
			<div class="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest">Logged in as</div>
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 rounded-full bg-psan-green flex items-center justify-center font-black text-white text-xs">
					{(data.user?.nickname || data.user?.username).substring(0,2).toUpperCase()}
				</div>
				<div class="text-xs font-bold">{data.user?.nickname || data.user?.username}</div>
			</div>
		</div>
	</aside>

	<!-- メインコンテンツ -->
	<main class="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950">
		<div class="p-4 md:p-12">
			{@render children()}
		</div>
	</main>
</div>

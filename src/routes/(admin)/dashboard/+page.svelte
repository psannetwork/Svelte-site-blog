<script lang="ts">
	import { t, type Language } from '$lib/i18n';
	let { data } = $props();

	const chartHeight = 120;
	const chartWidth = 600;

	const lang = $derived((data.settings?.site_language || 'ja') as Language);
	const stats = $derived(data.stats);
	const weekly = $derived([...stats.weekly].reverse());
	const maxHits = $derived(Math.max(...weekly.map((d) => d.hits), 10));

	const points = $derived(
		weekly.map((day, i) => {
			const x = (i / (weekly.length - 1)) * chartWidth;
			const y = chartHeight - (day.hits / maxHits) * chartHeight;
			return { x, y, hits: day.hits, date: day.date };
		})
	);

	const linePath = $derived(points.map((p) => `${p.x},${p.y}`).join(' '));
	const areaPath = $derived(`0,${chartHeight} ${linePath} ${chartWidth},${chartHeight}`);
</script>

<svelte:head>
	<title>{t(lang, 'overview')} | {data.settings?.site_title || 'Admin'}</title>
</svelte:head>

<div class="space-y-12">
	<!-- WELCOME HEADER -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-6">
		<div class="space-y-2">
			<h2 class="text-4xl md:text-6xl font-black tracking-tighter uppercase text-main leading-none">
				{t(lang, 'overview')}
			</h2>
			<div class="flex items-center gap-3">
				<span class="px-3 py-1 bg-psan-green/10 text-psan-green rounded-full text-[10px] font-black uppercase tracking-widest">{t(lang, 'live_stats')}</span>
				<p class="text-xs text-muted font-bold">
					{data.user?.role === 'author'
						? t(lang, 'personal_report')
						: t(lang, 'performance_analytics')}
				</p>
			</div>
		</div>
		<div class="hidden md:block text-right">
			<p class="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-1">{t(lang, 'last_updated')}</p>
			<p class="text-xs font-black text-main uppercase">{new Date().toLocaleTimeString()}</p>
		</div>
	</header>

	{#if data.user?.role !== 'author'}
		<!-- VIBRANT STATS -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			<div class="card-stats-vibrant group bg-gradient-to-br from-psan-green to-emerald-600">
				<div class="absolute -right-6 -bottom-6 opacity-20 scale-125 rotate-12 transition-transform group-hover:rotate-0">
					<svg class="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
				</div>
				<div class="relative z-10 space-y-4">
					<div class="text-[10px] font-black tracking-[0.3em] uppercase opacity-70">{t(lang, 'total_access')}</div>
					<div class="text-5xl md:text-7xl font-black tracking-tighter">
						{stats.totalHits.toLocaleString()}
					</div>
					<div class="pt-4">
						<span class="px-3 py-1 bg-white/20 rounded-full text-[9px] font-black uppercase">{t(lang, 'lifetime_access')}</span>
					</div>
				</div>
			</div>

			<div class="card-dashboard p-10 flex flex-col justify-between group hover:border-psan-green transition-colors">
				<div class="flex justify-between items-start">
					<div class="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-psan-green group-hover:bg-psan-green group-hover:text-white transition-all">
						<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
					</div>
					<div class="text-right">
						<div class="text-[10px] font-black text-muted uppercase tracking-widest mb-1">{t(lang, 'today_hits')}</div>
						<div class="text-3xl font-black text-main leading-none">+{stats.todayHits.toLocaleString()}</div>
					</div>
				</div>
				<div class="mt-8 space-y-2">
					<div class="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted">
						<span>{t(lang, 'daily_goal')}</span>
						<span>75%</span>
					</div>
					<div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
						<div class="h-full bg-psan-green w-[75%]" ></div>
					</div>
				</div>
			</div>

			<div class="card-dashboard p-10 flex flex-col justify-between group hover:border-psan-pink transition-colors">
				<div class="flex justify-between items-start">
					<div class="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-psan-pink group-hover:bg-psan-pink group-hover:text-white transition-all">
						<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
					</div>
					<div class="text-right">
						<div class="text-[10px] font-black text-muted uppercase tracking-widest mb-1">{t(lang, 'uniques')}</div>
						<div class="text-3xl font-black text-main leading-none">{stats.todayUniques.toLocaleString()}</div>
					</div>
				</div>
				<p class="mt-8 text-[10px] font-black text-muted uppercase leading-relaxed">
					{t(lang, 'active_users_msg')}
				</p>
			</div>
		</div>

		<!-- MODERN ANALYTICS -->
		<section class="space-y-6">
			<div class="flex items-center justify-between px-2">
				<h3 class="font-black text-xs tracking-[0.3em] text-muted uppercase">{t(lang, 'traffic_flow')}</h3>
				<div class="flex gap-2">
					<div class="flex items-center gap-1">
						<span class="w-2 h-2 rounded-full bg-psan-green"></span>
						<span class="text-[10px] font-black text-muted uppercase">Hits</span>
					</div>
				</div>
			</div>
			<div class="card-dashboard p-8 md:p-16 relative">
				<div class="absolute inset-0 opacity-[0.03] pointer-events-none" style="background-image: radial-gradient(var(--text-muted) 1px, transparent 1px); background-size: 32px 32px;"></div>
				<div class="relative w-full h-[200px] md:h-[300px]">
					<svg
						viewBox="0 0 {chartWidth} {chartHeight}"
						class="w-full h-full overflow-visible"
						preserveAspectRatio="none"
					>
						<defs>
							<linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stop-color="#00CC99" stop-opacity="0.4" />
								<stop offset="100%" stop-color="#00CC99" stop-opacity="0" />
							</linearGradient>
							<filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
								<feGaussianBlur stdDeviation="3" result="blur" />
								<feComposite in="SourceGraphic" in2="blur" operator="over" />
							</filter>
						</defs>
						<polygon points={areaPath} fill="url(#chartGradient)" />
						<polyline fill="none" stroke="#00CC99" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" points={linePath} filter="url(#glow)" />
						{#each points as p}
							<circle cx={p.x} cy={p.y} r="8" fill="#ffffff" stroke="#00CC99" stroke-width="4" class="transition-all duration-300 hover:r-12 cursor-pointer" />
						{/each}
					</svg>
					<div class="flex justify-between mt-10 border-t border-slate-100 dark:border-slate-800 pt-6">
						{#each weekly as day}
							<div class="text-center">
								<span class="block text-[10px] font-black text-main uppercase mb-1">{day.hits}</span>
								<span class="block text-[8px] font-black text-muted uppercase tracking-tighter">{day.date.split('-').slice(1).join('/')}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</section>
	{/if}

	<!-- RECENT CONTENT GRID -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-12 pb-40">
		<section class="space-y-6">
			<div class="flex items-center justify-between px-2">
				<h3 class="font-black text-xs tracking-[0.3em] text-muted uppercase">{t(lang, 'recent_posts')}</h3>
				<a href="/dashboard/posts" class="text-[10px] font-black text-psan-green uppercase hover:underline tracking-widest">{t(lang, 'view_all')}</a>
			</div>
			<div class="card-dashboard divide-y border-none shadow-xl shadow-slate-200/40 dark:shadow-none">
				{#each data.posts.slice(0, 4) as post}
					<a
						href="/dashboard/posts"
						class="flex items-center justify-between p-6 md:p-8 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group"
					>
						<div class="flex items-center gap-6 flex-1 min-w-0">
							<div class="w-16 h-16 rounded-[20px] bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform">
								{#if post.thumbnail_url}
									<img src={post.thumbnail_url} alt="" class="w-full h-full object-cover" />
								{:else}
									<span class="text-xs font-black text-muted opacity-40 uppercase">{post.title.substring(0, 1)}</span>
								{/if}
							</div>
							<div class="min-w-0">
								<span class="block font-black text-base text-main truncate mb-1 group-hover:text-psan-green transition-colors">{post.title}</span>
								<div class="flex items-center gap-3">
									<span class="text-[10px] font-black text-muted uppercase tracking-widest">{new Date(post.created_at).toLocaleDateString()}</span>
									<div class="flex items-center gap-1.5 px-2 py-0.5 bg-psan-pink/10 dark:bg-psan-pink/20 rounded-full border border-psan-pink/20 dark:border-psan-pink/40 text-psan-pink transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-110 hover:shadow-xl hover:shadow-psan-pink/30 hover:bg-psan-pink hover:text-white cursor-default">
										<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
										<span class="text-[8px] font-black italic uppercase tracking-tighter">{t(lang, 'by_author').replace('{author}', post.author_name)}</span>
									</div>
								</div>
							</div>
						</div>
						<svg class="w-5 h-5 text-slate-300 group-hover:text-psan-green group-hover:translate-x-2 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"/></svg>
					</a>
				{:else}
					<div class="p-20 text-center">
						<p class="text-[10px] font-black text-muted uppercase tracking-widest">{t(lang, 'no_data')}</p>
					</div>
				{/each}
			</div>
		</section>

		<section class="space-y-6">
			<div class="flex items-center justify-between px-2">
				<h3 class="font-black text-xs tracking-[0.3em] text-psan-pink uppercase">{t(lang, 'recent_comments')}</h3>
				<a href="/dashboard/comments" class="text-[10px] font-black text-psan-pink uppercase hover:underline tracking-widest">{t(lang, 'manage')}</a>
			</div>
			<div class="card-dashboard divide-y border-none shadow-xl shadow-psan-pink/5 dark:shadow-none">
				{#each data.comments.slice(0, 4) as comment}
					<div class="p-6 md:p-8 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group">
						<div class="flex justify-between items-center mb-3">
							<div class="flex items-center gap-2">
								<div class="w-2 h-2 rounded-full bg-psan-pink"></div>
								<span class="text-xs font-black uppercase text-main">{comment.username}</span>
							</div>
							<span class="text-[9px] font-black text-muted uppercase">{new Date(comment.created_at).toLocaleDateString()}</span>
						</div>
						<p class="text-sm font-bold text-muted group-hover:text-main transition-colors leading-relaxed line-clamp-2">{comment.content}</p>
					</div>
				{:else}
					<div class="p-20 text-center">
						<p class="text-[10px] font-black text-muted uppercase tracking-widest">{t(lang, 'no_data')}</p>
					</div>
				{/each}
			</div>
		</section>
	</div>
</div>

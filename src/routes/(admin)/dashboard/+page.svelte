<script lang="ts">
	import { untrack } from 'svelte';
	let { data } = $props();

	const chartHeight = 120;
	const chartWidth = 600;

	// data全体をリアクティブに追従させるための計算
	const stats = $derived(data.stats);
	const weekly = $derived([...stats.weekly].reverse());
	const maxHits = $derived(Math.max(...weekly.map(d => d.hits), 10));
	
	const points = $derived(weekly.map((day, i) => {
		const x = (i / (weekly.length - 1)) * chartWidth;
		const y = chartHeight - (day.hits / maxHits) * chartHeight;
		return { x, y, hits: day.hits, date: day.date };
	}));

	const linePath = $derived(points.map(p => `${p.x},${p.y}`).join(' '));
	const areaPath = $derived(`0,${chartHeight} ${linePath} ${chartWidth},${chartHeight}`);
</script>

<svelte:head>
	<title>Dashboard | {data.settings?.site_title || 'Admin'}</title>
</svelte:head>

<div class="max-w-7xl mx-auto space-y-8 md:space-y-12">
	<header>
		<h2 class="text-3xl md:text-4xl font-black tracking-tighter text-main uppercase">Overview</h2>
		<p class="text-sm text-muted font-bold">サイトのパフォーマンスをリアルタイムで分析します。</p>
	</header>

	<!-- アクセス統計サマリー -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
		<div class="card-psan p-6 md:p-8 bg-psan-green text-white border-none shadow-psan-green/20 shadow-xl relative overflow-hidden group">
			<div class="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
				<svg class="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
			</div>
			<div class="relative z-10">
				<div class="text-[10px] font-black tracking-[0.2em] uppercase opacity-60 mb-2">Total Access</div>
				<div class="text-4xl md:text-6xl font-black tracking-tighter">{stats.totalHits.toLocaleString()}</div>
			</div>
		</div>
		<div class="card-psan p-6 md:p-8">
			<div class="text-[10px] font-black tracking-[0.2em] uppercase text-psan-green mb-2">Today's Hits</div>
			<div class="text-4xl md:text-5xl font-black text-main tracking-tighter">{stats.todayHits.toLocaleString()}</div>
		</div>
		<div class="card-psan p-6 md:p-8">
			<div class="text-[10px] font-black tracking-[0.2em] uppercase text-psan-pink mb-2">Today's Uniques</div>
			<div class="text-4xl md:text-5xl font-black text-main tracking-tighter">{stats.todayUniques.toLocaleString()}</div>
		</div>
	</div>

	<!-- 折れ線グラフ -->
	<div class="space-y-4">
		<h3 class="font-black text-xs tracking-widest text-muted uppercase px-2">Access Analytics</h3>
		<div class="card-psan p-4 md:p-12">
			<div class="relative w-full h-[150px] md:h-[200px]">
				<svg viewBox="0 0 {chartWidth} {chartHeight}" class="w-full h-full overflow-visible" preserveAspectRatio="none">
					<defs>
						<linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="#00CC99" stop-opacity="0.3" />
							<stop offset="100%" stop-color="#00CC99" stop-opacity="0" />
						</linearGradient>
					</defs>
					<polygon points={areaPath} fill="url(#chartGradient)" />
					<polyline fill="none" stroke="#00CC99" stroke-width="4" points={linePath} />
					{#each points as p}
						<circle cx={p.x} cy={p.y} r="6" fill="#ffffff" stroke="#00CC99" stroke-width="3" />
					{/each}
				</svg>
				<div class="flex justify-between mt-6">
					{#each weekly as day}
						<span class="text-[8px] md:text-[9px] font-black text-muted uppercase tracking-tighter">{day.date.split('-').slice(1).join('/')}</span>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- 最近のコンテンツ -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
		<section class="space-y-4">
			<h3 class="font-black text-xs tracking-widest text-muted uppercase px-2">Recent Posts</h3>
			<div class="card-psan divide-y border-[--border-color]">
				{#each data.posts.slice(0, 3) as post}
					<a href="/dashboard/posts" class="flex items-center justify-between p-5 md:p-6 hover:bg-slate-50 transition">
						<span class="font-black text-sm text-main truncate pr-4">{post.title}</span>
						<span class="text-[9px] font-black text-muted uppercase shrink-0">{new Date(post.created_at).toLocaleDateString()}</span>
					</a>
				{/each}
			</div>
		</section>

		<section class="space-y-4">
			<h3 class="font-black text-xs tracking-widest text-psan-pink uppercase px-2">Recent Comments</h3>
			<div class="card-psan divide-y border-[--border-color]">
				{#each data.comments.slice(0, 3) as comment}
					<div class="p-5 md:p-6">
						<div class="flex justify-between items-center mb-1">
							<span class="text-xs font-black text-psan-green uppercase">{comment.username}</span>
							<span class="text-[9px] font-black text-muted">{new Date(comment.created_at).toLocaleDateString()}</span>
						</div>
						<p class="text-sm font-bold text-main line-clamp-1">{comment.content}</p>
					</div>
				{/each}
			</div>
		</section>
	</div>
</div>

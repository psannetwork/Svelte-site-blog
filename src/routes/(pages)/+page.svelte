<script lang="ts">
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import { t, type Language } from '$lib/i18n';
	let { data } = $props<{ data: PageData }>();
	const lang = $derived((data.settings?.site_language || 'ja') as Language);
</script>

<svelte:head>
	<!-- 構造化データ (ItemList) -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "ItemList",
			"itemListElement": data.posts.map((post, index) => ({
				"@type": "ListItem",
				"position": index + 1,
				"item": {
					"@type": "BlogPosting",
					"headline": post.title,
					"description": post.summary || "",
					"image": post.thumbnail_url,
					"datePublished": new Date(post.created_at).toISOString(),
					"author": {
						"@type": "Person",
						"name": post.author_name
					},
					"url": `${page.url.origin}/${post.id}`
				}
			}))
		}
	</script>
</svelte:head>

<!-- 検索結果表示 -->
{#if data.searchQuery}
	<div class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-8 md:py-12">
		<div class="max-w-7xl mx-auto px-4">
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<div class="flex items-center gap-3 mb-2">
						<svg class="w-5 h-5 md:w-6 md:h-6 text-psan-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg
						>
						<h1 class="text-lg md:text-xl font-black uppercase tracking-tighter">Search Results</h1>
					</div>
					<p class="text-sm md:text-base font-medium text-muted">
						キーワード: <span class="text-psan-green font-black">"{data.searchQuery}"</span>
					</p>
					<p class="text-xs md:text-sm font-bold text-muted mt-2 flex items-center gap-2">
						<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-psan-green text-white text-xs font-black">{data.posts.length}</span>
						件の記事が見つかりました
					</p>
				</div>
				<a
					href="/"
					class="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-sm hover:bg-psan-pink hover:text-white transition-all group"
				>
					<svg class="w-4 h-4 transition-transform group-hover:-rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg
					>
					クリア
				</a>
			</div>
		</div>
	</div>
{/if}

<!-- 編集ボタン (Admin のみ) -->
{#if data.user?.role === 'admin' || data.user?.role === 'editor'}
	<div class="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[9999]">
		<a
			href="/dashboard/pages/home"
			class="flex items-center gap-2 bg-psan-dark dark:bg-psan-green text-white dark:text-psan-green-fg px-4 py-2 md:px-6 md:py-3 rounded-full font-black shadow-2xl hover:scale-105 transition-all uppercase tracking-widest text-[10px] md:text-xs border-4 border-white dark:border-slate-900"
		>
			<svg class="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="3"
					d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
				/></svg
			>
			<span class="hidden md:inline">{t(lang, 'edit_page')}</span>
			<span class="md:hidden">Edit</span>
		</a>
	</div>
{/if}

<!-- メインコンテンツ -->
<article class="relative pt-20 pb-20 overflow-hidden transition-colors" style="overflow-x: clip;">
	<div class="max-w-7xl mx-auto px-4 relative">
		<div
			class="max-w-5xl prose prose-xl dark:prose-invert w-full prose-headings:font-black prose-headings:tracking-tighter prose-p:font-medium prose-img:rounded-[40px] prose-img:shadow-2xl prose-img:max-w-full overflow-x-hidden break-words"
		>
			{@html data.homeHtml}
		</div>
	</div>
</article>

<!-- 記事リスト (固定位置に戻す) -->
<section class="py-16 md:py-24 border-t border-slate-100 dark:border-slate-800 transition-colors">
	<div class="max-w-7xl mx-auto px-4">
		<div class="flex items-end justify-between mb-12 md:mb-16 px-4">
			<div>
				<h2 class="text-2xl md:text-3xl font-black uppercase tracking-tighter">{t(lang, 'latest_stories')}</h2>
				<div class="h-1.5 w-12 bg-psan-pink mt-2"></div>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
			{#each data.posts as post}
				<article class="group px-4">
					<a href="/{post.id}" class="block">
						<div
							class="w-full aspect-video rounded-2xl md:rounded-3xl bg-psan-green/10 dark:bg-slate-800 mb-4 md:mb-6 overflow-hidden flex items-center justify-center relative group-hover:scale-[1.02] transition-transform duration-500"
						>
							{#if post.thumbnail_url}
								<img src={post.thumbnail_url} alt="" class="w-full h-full object-cover" />
							{:else}
								<span
									class="text-4xl md:text-6xl font-black text-psan-green/20 dark:text-slate-500 uppercase italic tracking-tighter"
									>{post.title.substring(0, 1)}</span
								>
							{/if}
						</div>
						<div class="space-y-2 md:space-y-3">
							<div
								class="flex items-center gap-2 md:gap-3 text-[9px] md:text-[10px] font-black tracking-widest text-muted uppercase flex-wrap"
							>
								<span class="shrink-0">{new Date(post.created_at).toLocaleDateString()}</span>
								<span class="w-1 h-1 bg-psan-green rounded-full shrink-0"></span>
								{#if post.is_pinned === 1}
									<span class="text-psan-green font-black shrink-0 flex items-center gap-1">
										<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"/></svg>
										PINNED
									</span>
									<span class="w-1 h-1 bg-psan-green rounded-full shrink-0"></span>
								{/if}
								{#if post.visibility === 'vip'}
									<span class="text-psan-pink font-black shrink-0">💎 VIP</span>
								{:else if post.visibility === 'draft'}
									<span class="italic shrink-0">📁 DRAFT</span>
								{:else}
									<span class="text-psan-green shrink-0">ARTICLE</span>
								{/if}
								<span class="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full shrink-0"></span>
								<div class="flex items-center gap-1 text-muted/60 min-w-0">
									<svg class="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
										/></svg
									>
									<span class="text-[8px] md:text-[9px] font-bold italic tracking-tight uppercase truncate">{t(lang, 'by_author').replace('{author}', post.author_name)}</span>
								</div>
							</div>
							<h3
								class="text-lg md:text-2xl font-black leading-tight group-hover:text-psan-green transition-colors line-clamp-2"
							>
								{post.title}
							</h3>
							<p class="text-muted text-xs md:text-sm line-clamp-2 font-medium leading-relaxed">
								{post.summary || 'No summary available.'}
							</p>
						</div>
					</a>
				</article>
			{:else}
				<div
					class="col-span-full py-20 md:py-32 text-center border-2 border-dashed border-[--border-color] rounded-[32px] md:rounded-[40px]"
				>
					<p class="text-muted font-bold tracking-tighter uppercase text-sm md:text-base">{t(lang, 'no_data')}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

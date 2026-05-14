<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { theme } from '$lib/theme.svelte';
	import { t, type Language } from '$lib/i18n';
	import { applyColors } from '$lib/utils/color';
	import { onMount } from 'svelte';
	import DOMPurify from 'isomorphic-dompurify';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();
	const lang = $derived((data.settings?.site_language || 'ja') as Language);
	let replyingTo = $state<string | null>(null);
	let isPosting = $state(false);

	// コメントのサニタイズ
	function sanitizeComment(str: string): string {
		return DOMPurify.sanitize(str);
	}

	// ハイブリッド配色の適用
	onMount(() => {
		const content = document.querySelector('article .prose');
		if (content) {
			applyColors(content as HTMLElement, theme.current === 'dark');
			initTabs(content as HTMLElement);
		}
	});

	// テーマ変更時に再適用
	$effect(() => {
		const content = document.querySelector('article .prose');
		if (content) {
			applyColors(content as HTMLElement, theme.current === 'dark');
			initTabs(content as HTMLElement);
		}
	});

	// タブ切り替え機能の初期化
	function initTabs(container: HTMLElement) {
		const tabContainers = container.querySelectorAll('.tabs-container');
		tabContainers.forEach(tabContainer => {
			const buttons = tabContainer.querySelectorAll('.tab-btn');
			const contents = tabContainer.querySelectorAll('.tab-content');
			
			buttons.forEach((btn, index) => {
				btn.addEventListener('click', () => {
					buttons.forEach(b => b.classList.remove('active'));
					contents.forEach(c => c.classList.remove('active'));
					btn.classList.add('active');
					contents[index].classList.add('active');
				});
			});
		});
	}

	// Turnstileを手動でレンダリングするアクション
	function turnstileAction(node: HTMLElement) {
		if (data.settings.enable_turnstile !== 'true') return;

		const render = () => {
			if (window.turnstile) {
				window.turnstile.render(node, {
					sitekey: data.settings.turnstile_site_key,
					theme: theme.current === 'dark' ? 'dark' : 'light',
					callback: (token: string) => {
						// 必要に応じてトークン取得後の処理
					}
				});
			} else {
				// スクリプトがまだ読み込まれていない場合はリトライ
				setTimeout(render, 500);
			}
		};

		render();

		return {
			destroy() {
				if (window.turnstile && node) {
					try {
						window.turnstile.remove(node);
					} catch (e) {}
				}
			}
		};
	}

	const commentTree = $derived.by(() => {
		const map = new Map<string, any>();
		const roots: any[] = [];
		data.comments.forEach((c: any) => {
			map.set(c.id, { ...c, replies: [] });
		});
		data.comments.forEach((c: any) => {
			const node = map.get(c.id);
			if (c.parent_id && map.has(c.parent_id)) {
				map.get(c.parent_id).replies.push(node);
			} else {
				roots.push(node);
			}
		});
		return roots;
	});

	// コードブロックのコピー機能
	function setupCodeCopy(node: HTMLElement) {
		const handleCopy = async (e: MouseEvent) => {
			const btn = (e.target as HTMLElement).closest('.copy-code-btn');
			if (!btn) return;

			const container = btn.closest('.code-block-container');
			const code = container?.querySelector('code')?.innerText;

			if (code) {
				try {
					await navigator.clipboard.writeText(code);
					const originalText = (btn as HTMLElement).innerText;
					(btn as HTMLElement).innerText = 'Copied!';
					btn.classList.add('!bg-psan-green');
					setTimeout(() => {
						(btn as HTMLElement).innerText = originalText;
						btn.classList.remove('!bg-psan-green');
					}, 2000);
				} catch (err) {
					console.error('Copy failed', err);
				}
			}
		};

		node.addEventListener('click', handleCopy);
		return {
			destroy() {
				node.removeEventListener('click', handleCopy);
			}
		};
	}
</script>

<svelte:head>
	{#if data.settings.enable_turnstile === 'true'}
		<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
	{/if}
	
	<!-- 記事固有の SEO メタタグ -->
	<meta name="description" content={data.post.summary || `「${data.post.title}」の記事を読む`} />
	<meta name="author" content={data.post.author_name || 'Unknown'} />
	<meta name="article:published_time" content={new Date(data.post.created_at).toISOString()} />
	{#if data.post.updated_at}
		<meta name="article:modified_time" content={new Date(data.post.updated_at).toISOString()} />
	{/if}
	
	<!-- Open Graph 記事用 -->
	<meta property="og:type" content="article" />
	<meta property="og:title" content={data.post.title} />
	<meta property="og:description" content={data.post.summary || ''} />
	{#if data.post.thumbnail_url}
		<meta property="og:image" content={data.post.thumbnail_url} />
	{/if}
	<meta property="og:article:author" content={data.post.author_name || ''} />
	<meta property="og:article:published_time" content={new Date(data.post.created_at).toISOString()} />
	{#if data.post.updated_at}
		<meta property="og:article:modified_time" content={new Date(data.post.updated_at).toISOString()} />
	{/if}
	
	<!-- Twitter Cards 記事用 -->
	<meta name="twitter:title" content={data.post.title} />
	<meta name="twitter:description" content={data.post.summary || ''} />
	{#if data.post.thumbnail_url}
		<meta name="twitter:image" content={data.post.thumbnail_url} />
	{/if}
	
	<!-- 構造化データ (Article) -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "BlogPosting",
			"headline": data.post.title,
			"description": data.post.summary || "",
			"image": data.post.thumbnail_url,
			"datePublished": new Date(data.post.created_at).toISOString(),
			"dateModified": data.post.updated_at ? new Date(data.post.updated_at).toISOString() : new Date(data.post.created_at).toISOString(),
			"author": {
				"@type": "Person",
				"name": data.post.author_name || "Unknown"
			},
			"publisher": {
				"@type": "Organization",
				"name": data.settings?.site_title || "Svelte Site Blog",
				"logo": {
					"@type": "ImageObject",
					"url": data.settings?.site_icon_url || "https://blog.psannetwork.net/favicon.svg"
				}
			},
			"url": `https://blog.psannetwork.net/${data.post.id}`
		}
	</script>
</svelte:head>

{#snippet commentItem(comment: any, depth = 0)}
	<!-- "Side Comment" Logic:
		- Depth 0: Main Thread
		- Depth 1+: Flattened replies with slight indent to show relationship, but do NOT indent infinitely.
		- Mobile: Max indent 1 level.
	-->
	{@const isRoot = depth === 0}

	<!-- Visual Distinction for Replies: Add background and tighter spacing -->
	<div
		class="comment-container flex gap-2 md:gap-4 group {isRoot
			? 'mt-6 md:mt-8'
			: 'mt-2 md:mt-3 bg-slate-50 dark:bg-slate-900/30 p-2 md:p-3 lg:p-4 rounded-lg md:rounded-xl'}"
	>
		<div
			class="{isRoot
				? 'w-8 h-8 md:w-10 md:h-10'
				: 'w-5 h-5 md:w-8 md:h-8'} rounded-xl md:rounded-2xl bg-white dark:bg-slate-800 overflow-hidden shrink-0 shadow-sm"
		>
			{#if comment.avatar_url}
				<img src={comment.avatar_url} alt="" class="w-full h-full object-cover" />
			{:else}
				<div
					class="w-full h-full flex items-center justify-center text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-300 uppercase"
				>
					{comment.author_name.substring(0, 1)}
				</div>
			{/if}
		</div>
		<div class="flex-1 min-w-0">
			<div class="flex items-center justify-between gap-2 md:gap-4 mb-1.5 md:mb-2">
				<div class="flex items-center gap-1.5 md:gap-2 flex-wrap min-w-0">
					<span class="text-xs md:text-sm font-black text-slate-900 dark:text-white truncate max-w-[150px] md:max-w-none">{comment.author_name}</span>
					{#if comment.author_role === 'admin'}
						<span
							class="text-[10px] font-black px-2 py-0.5 bg-psan-green text-psan-green-fg rounded uppercase tracking-wider shrink-0"
							>Admin</span
						>
					{/if}
					{#if comment.parent_id}
						{@const parent = data.comments.find((c: any) => c.id === comment.parent_id)}
						{#if parent}
							<span class="text-[10px] text-muted font-bold flex items-center gap-1">
								<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
									/></svg
								>
								to {parent.author_name}
							</span>
						{/if}
					{/if}
				</div>
				<time class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap"
					>{new Date(comment.created_at).toLocaleString()}</time
				>
			</div>
			<div
				class="text-base font-medium leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap relative z-10 break-words max-w-full overflow-wrap-anywhere"
				style="word-break: break-word; overflow-wrap: break-word;"
			>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html sanitizeComment(comment.content)}
			</div>

			<div class="flex items-center gap-2 mt-3">
				<button
					onclick={() => (replyingTo = replyingTo === comment.id ? null : comment.id)}
					class="btn-action-sm flex items-center gap-1.5 !text-psan-green"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2.5"
							d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
						/></svg
					>
					{replyingTo === comment.id ? 'Cancel' : 'Reply'}
				</button>

				{#if data.user?.role === 'admin' || data.user?.role === 'editor'}
					<form
						method="POST"
						action="?/deleteComment"
						use:enhance={({ cancel }) => {
							if (!confirm('このコメントを削除しますか？')) {
								cancel();
							}
							return async ({ update }) => {
								await update();
							};
						}}
					>
						<input type="hidden" name="id" value={comment.id} />
						<button type="submit" class="btn-action-sm flex items-center gap-1.5 !text-psan-pink">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2.5"
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/></svg
							>
							Delete
						</button>
					</form>
				{/if}
			</div>

			{#if replyingTo === comment.id}
				<form
					method="POST"
					action="?/addComment"
					use:enhance={() => {
						isPosting = true;
						return async ({ update }) => {
							await update();
							isPosting = false;
							replyingTo = null;
						};
					}}
					class="mt-4 space-y-4"
				>
					<input type="hidden" name="parentId" value={comment.id} />
					<textarea
						name="content"
						rows="3"
						required
						class="w-full bg-secondary dark:bg-slate-900 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-psan-green"
						placeholder="リプライを入力..."
					></textarea>

					{#if data.settings.enable_turnstile === 'true'}
						<div use:turnstileAction></div>
					{/if}

					<div class="flex justify-end">
						<button
							type="submit"
							class="btn-psan-primary py-2 px-6 text-xs uppercase tracking-widest"
							disabled={isPosting}
						>
							{isPosting ? 'Sending...' : 'Send Reply'}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>

	<!-- Replies: Rendered OUTSIDE the flex container to control nesting -->
	{#if comment.replies.length > 0}
		<!-- 
			Indentation Logic:
			- If Root (depth 0): Indent children with a colored thread line.
			- If Depth >= 1: DO NOT Indent further structurally, just stack them.
		-->
		<div
			class={depth === 0
				? 'pl-3 md:pl-6 border-l-4 border-slate-100 dark:border-slate-800 mt-4 space-y-4'
				: 'mt-4 space-y-4'}
		>
			{#each comment.replies as reply}
				{@render commentItem(reply, depth + 1)}
			{/each}
		</div>
	{/if}
{/snippet}

<article class="max-w-4xl mx-auto px-4 py-12 md:py-20 overflow-x-hidden" style="overflow-x: clip;">
	<header class="mb-8 md:mb-12">
		<!-- パンくずリスト -->
		<nav class="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-muted uppercase tracking-widest mb-4">
			<a href="/" class="hover:text-psan-green transition-colors">Home</a>
			<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg
			>
			<span class="truncate max-w-[200px] md:max-w-none">{data.post.title}</span>
		</nav>

		<h1 class="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter dark:text-white leading-[1.1] break-words">
			{data.post.title}
		</h1>
		{#if data.post.author_name}
			<div class="mt-4 md:mt-6 flex items-center gap-1.5 text-muted/60">
				<svg class="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
					/></svg
				>
				<span class="text-[9px] md:text-[10px] font-bold uppercase tracking-widest italic truncate max-w-full">
					{t(lang, 'by_author').replace('{author}', data.post.author_name)}
				</span>
			</div>
		{/if}

		<!-- ソーシャル共有ボタン -->
		<div class="mt-6 flex items-center gap-3">
			<span class="text-[9px] md:text-[10px] font-black text-muted uppercase tracking-widest">Share:</span>
			<button
				onclick={() => navigator.clipboard.writeText(page.url.href)}
				class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-psan-green hover:text-white transition-all"
				title="URL をコピー"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg
				>
			</button>
			<a
				href="https://twitter.com/intent/tweet?text={encodeURIComponent(data.post.title)}&url={encodeURIComponent(page.url.href)}"
				target="_blank"
				rel="noopener noreferrer"
				class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#1DA1F2] hover:text-white transition-all"
				title="X (Twitter) で共有"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"
					><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg
				>
			</a>
			<a
				href="https://www.facebook.com/sharer/sharer.php?u={encodeURIComponent(page.url.href)}"
				target="_blank"
				rel="noopener noreferrer"
				class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#1877F2] hover:text-white transition-all"
				title="Facebook で共有"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"
					><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg
				>
			</a>
			<a
				href="https://www.linkedin.com/shareArticle?mini=true&url={encodeURIComponent(page.url.href)}&title={encodeURIComponent(data.post.title)}"
				target="_blank"
				rel="noopener noreferrer"
				class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#0A66C2] hover:text-white transition-all"
				title="LinkedIn で共有"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"
					><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg
				>
			</a>
		</div>
	</header>

	<div
		use:setupCodeCopy
		class="prose prose-slate prose-lg md:prose-xl dark:prose-invert w-full max-w-none mb-12 md:mb-20 border-b border-slate-100 dark:border-slate-800 pb-12 md:pb-20 prose-img:rounded-[32px] md:prose-img:rounded-[40px] prose-img:shadow-2xl prose-img:max-w-full break-words overflow-x-hidden"
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html data.post.content}
	</div>

	<section id="comments" class="max-w-3xl mx-auto my-12 md:my-20 px-2">
		<h2 class="text-xl md:text-2xl font-black tracking-tighter mb-6 md:mb-10 uppercase">
			Feedback ({data.comments.length})
		</h2>

		<div class="space-y-3 md:space-y-4 mb-10 md:mb-16">
			{#each commentTree as comment}
				{@render commentItem(comment)}
			{:else}
				<p class="text-center py-8 md:py-10 text-[10px] md:text-xs font-black text-muted uppercase tracking-[0.3em]">
					No comments yet.
				</p>
			{/each}
		</div>

		{#if data.settings.allow_comments}
			{#if data.user || data.settings.allow_anonymous_comments}
				<form
					method="POST"
					action="?/addComment"
					use:enhance={() => {
						isPosting = true;
						return async ({ update, result }) => {
							await update();
							isPosting = false;
						};
					}}
					class="card-psan p-4 md:p-10 space-y-4 md:space-y-6"
				>
					<h3
						class="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300"
					>
						New Comment
					</h3>
					<textarea
						name="content"
						rows="4"
						required
						class="w-full bg-secondary dark:bg-slate-900 border-none rounded-xl md:rounded-2xl p-4 md:p-6 text-sm md:text-base font-medium focus:ring-2 focus:ring-psan-green transition-all"
						placeholder="Write something..."
					></textarea>

					{#if data.settings.enable_turnstile === 'true'}
						<div use:turnstileAction></div>
					{/if}

					<div class="flex justify-end">
						<button type="submit" class="btn-psan-primary px-8 md:px-12 py-2 md:py-3 text-xs md:text-sm" disabled={isPosting}>
							{isPosting ? 'Posting...' : 'Post Comment'}
						</button>
					</div>
				</form>
			{:else}
				<div class="card-psan p-6 md:p-10 text-center border-dashed border-2">
					<p class="text-[10px] md:text-xs font-black text-muted mb-6 md:mb-8 uppercase tracking-[0.3em]">
						Login required to comment
					</p>
					<a href="/auth/login" class="btn-psan-primary inline-flex py-2 md:py-3 px-6 md:px-8 text-xs md:text-sm">Login Now</a>
				</div>
			{/if}
		{/if}
	</section>
</article>

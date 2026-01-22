<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { theme } from '$lib/theme.svelte';
	import { t, type Language } from '$lib/i18n';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();
	const lang = $derived((data.settings?.site_language || 'ja') as Language);
	let replyingTo = $state<string | null>(null);
	let isPosting = $state(false);

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
		class="flex gap-3 md:gap-4 group {isRoot
			? 'mt-8'
			: 'mt-3 bg-slate-50 dark:bg-slate-900/30 p-3 md:p-4 rounded-xl'}"
	>
		<div
			class="{isRoot
				? 'w-10 h-10'
				: 'w-6 h-6 md:w-8 md:h-8'} rounded-2xl bg-white dark:bg-slate-800 overflow-hidden shrink-0 shadow-sm"
		>
			{#if comment.avatar_url}
				<img src={comment.avatar_url} alt="" class="w-full h-full object-cover" />
			{:else}
				<div
					class="w-full h-full flex items-center justify-center text-xs font-black text-slate-400 dark:text-slate-300 uppercase"
				>
					{comment.author_name.substring(0, 1)}
				</div>
			{/if}
		</div>
		<div class="flex-1 min-w-0">
			<div class="flex items-center justify-between gap-4 mb-2">
				<div class="flex items-center gap-2 flex-wrap">
					<span class="text-sm font-black dark:text-white truncate">{comment.author_name}</span>
					{#if comment.author_role === 'admin'}
						<span
							class="text-[10px] font-black px-2 py-0.5 bg-psan-green text-psan-green-fg rounded uppercase tracking-wider shrink-0"
							>Admin</span
						>
					{/if}
															{#if comment.parent_id}
																	{@const parent = data.comments.find((c: any) => c.id === comment.parent_id)}
																	{#if parent}							<span class="text-[10px] text-muted font-bold flex items-center gap-1">
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
				<time class="text-[10px] font-bold text-muted uppercase whitespace-nowrap"
					>{new Date(comment.created_at).toLocaleString()}</time
				>
			</div>
			<div
				class="text-base font-medium leading-relaxed dark:text-slate-300 whitespace-pre-wrap relative z-10"
			>
				{comment.content}
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

<article class="max-w-4xl mx-auto px-4 py-20 overflow-x-hidden" style="overflow-x: clip;">
	<header class="mb-12">
		<h1 class="text-4xl md:text-6xl font-black tracking-tighter dark:text-white leading-[1.1]">
			{data.post.title}
		</h1>
		{#if data.post.author_name}
			<p class="text-sm font-black text-psan-green uppercase tracking-[0.2em] mt-4">
				{t(lang, 'by_author').replace('{author}', data.post.author_name)}
			</p>
		{/if}
	</header>

	<div
		use:setupCodeCopy
		class="prose prose-slate prose-xl dark:prose-invert w-full max-w-none mb-20 border-b border-slate-100 dark:border-slate-800 pb-20 prose-img:rounded-[40px] prose-img:shadow-2xl prose-img:max-w-full break-words overflow-x-hidden"
	>
		{@html data.post.content}
	</div>

	<section id="comments" class="max-w-3xl mx-auto my-20">
		<h2 class="text-2xl font-black tracking-tighter mb-10 uppercase">
			Feedback ({data.comments.length})
		</h2>

		<div class="space-y-4 mb-16">
			{#each commentTree as comment}
				{@render commentItem(comment)}
			{:else}
				<p class="text-center py-10 text-xs font-bold opacity-30 uppercase tracking-widest">
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
					class="card-psan p-6 md:p-10 space-y-6"
				>
					<h3
						class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300"
					>
						New Comment
					</h3>
					<textarea
						name="content"
						rows="4"
						required
						class="w-full bg-secondary dark:bg-slate-900 border-none rounded-2xl p-6 text-base font-medium focus:ring-2 focus:ring-psan-green transition-all"
						placeholder="Write something..."
					></textarea>

					{#if data.settings.enable_turnstile === 'true'}
						<div use:turnstileAction></div>
					{/if}

					<div class="flex justify-end">
						<button type="submit" class="btn-psan-primary px-12" disabled={isPosting}>
							{isPosting ? 'Posting...' : 'Post Comment'}
						</button>
					</div>
				</form>
			{:else}
				<div class="card-psan p-10 text-center border-dashed border-2">
					<p class="text-sm font-bold opacity-40 mb-6 uppercase tracking-widest">
						Login required to comment
					</p>
					<a href="/auth/login" class="btn-psan-primary inline-flex">Login Now</a>
				</div>
			{/if}
		{/if}
	</section>
</article>

<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	
	let { data, form } = $props<{ data: PageData, form: ActionData }>();
</script>

<svelte:head>
	{#if data.settings.enable_turnstile}
		<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
	{/if}
</svelte:head>

<article class="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
	<header class="mb-8">
		<h1 class="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-5xl">
			{data.post.title}
		</h1>
		<div class="mt-4 text-sm text-gray-500 dark:text-gray-400">
			<span class="inline-flex items-center gap-1">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
				{new Date(data.post.created_at).toLocaleDateString("ja-JP")}
			</span>
			<span class="mx-2">•</span>
			<span class="inline-flex items-center gap-1">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
				{data.post.views || 0} 回
			</span>
		</div>
	</header>

	<div class="prose prose-indigo prose-lg text-gray-700 dark:prose-invert dark:text-gray-300 mx-auto border-b border-gray-200 dark:border-gray-700 pb-12">
		{@html data.post.content}
	</div>

	<!-- コメントセクション -->
	<section class="mt-12">
		<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-2">
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
			コメント ({data.comments.length})
		</h2>

		<div class="space-y-6 mb-12">
			{#each data.comments as comment}
				<div class="bg-gray-50 dark:bg-gray-800 p-5 rounded-xl relative border border-gray-200 dark:border-gray-700">
					<div class="flex justify-between items-start mb-3">
						<div class="flex items-center gap-2">
							<div class="w-8 h-8 rounded-full bg-psan-green/20 flex items-center justify-center text-xs font-bold text-psan-green">
								{comment.author_name.charAt(0).toUpperCase()}
							</div>
							<div>
								<div class="font-bold text-gray-900 dark:text-white text-sm">
									{comment.author_name}
									{#if comment.author_role === 'admin'}
										<span class="ml-2 px-2 py-0.5 bg-psan-pink text-white text-xs rounded">管理者</span>
									{/if}
								</div>
							</div>
						</div>
						<div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
							{new Date(comment.created_at).toLocaleString()}
						</div>
					</div>
					<p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap pl-10">{comment.content}</p>

					{#if data.user?.role === 'admin'}
						<form method="POST" action="?/deleteComment" use:enhance class="absolute top-3 right-3">
							<input type="hidden" name="id" value={comment.id} />
							<button type="submit" class="text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
								削除
							</button>
						</form>
					{/if}
				</div>
			{/each}
		</div>

		{#if data.settings.allow_comments}
			{#if data.user}
				<form method="POST" action="?/addComment" use:enhance class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
					<h3 class="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
						コメントを投稿する
					</h3>
					<textarea
						name="content"
						rows="4"
						class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-psan-green focus:border-psan-green bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
						placeholder="コメントを入力してください..."
					></textarea>

					{#if data.settings.enable_turnstile}
						<div class="cf-turnstile mt-4" data-sitekey={data.settings.turnstile_site_key}></div>
					{/if}

					<div class="mt-4 flex justify-end">
						<button type="submit" class="bg-psan-green text-white px-6 py-2.5 rounded-full font-bold transition-all duration-300 transform active:scale-95 shadow-lg flex items-center justify-center gap-2 hover:opacity-90">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
							送信
						</button>
					</div>
				</form>
			{:else}
				<div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl text-center border border-gray-200 dark:border-gray-700">
					<p class="text-gray-600 dark:text-gray-300">コメントを投稿するには <a href="/auth/login" class="text-psan-green font-bold hover:underline">ログイン</a> が必要です。</p>
				</div>
			{/if}
		{:else}
			<div class="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl text-center border border-yellow-200 dark:border-yellow-800">
				<p class="text-yellow-700 dark:text-yellow-300 italic">現在コメントは受け付けておりません。</p>
			</div>
		{/if}
	</section>
</article>
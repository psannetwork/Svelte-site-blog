<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { WidgetTool } from '$lib/editor/WidgetTool';
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data: PageData, form: ActionData }>();
	let editor: any;
	let formElement: HTMLFormElement;
	let title = $state(data.post.title);
	let summary = $state(data.post.summary || '');
	let visibility = $state(data.post.visibility);
	let editorData = $state(data.post.raw_json || '');
	let isSaving = $state(false);

	// サーバーからのデータが更新されたときのみ同期（エディタ実行中は無視）
	$effect(() => {
		if (!isSaving && data.post.raw_json !== editorData) {
			// ただし、エディタが既にある場合は、外部からの変更（他ブラウザ等）がない限り同期しない
			// ここでは初期読み込み時のみを想定
		}
	});

	async function handleKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			await submitForm();
		}
	}

	async function submitForm() {
		if (!editor || isSaving) return;
		isSaving = true;
		try {
			const saved = await editor.save();
			const json = JSON.stringify(saved);
			editorData = json; // ローカルステートを更新
			
			// 隠しフィールドの値を確実に更新するために少し待機
			setTimeout(() => {
				formElement?.requestSubmit();
			}, 20);
		} catch (err) {
			console.error('Save failed', err);
			isSaving = false;
		}
	}

	onMount(async () => {
		if (editor) return; 

		const EditorJS = (await import('@editorjs/editorjs')).default;
		// ... 省略 ...
		
		let parsedData = { blocks: [] };
		try {
			// 現在の editorData (保存直後の値を含む) を優先して使用
			if (editorData) {
				const data = JSON.parse(editorData);
				if (data && data.blocks) parsedData = data;
			}
		} catch (e) {}

		if (parsedData.blocks.length === 0) {
			parsedData.blocks.push({ type: 'paragraph', data: { text: '' } });
		}

		editor = new EditorJS({
			holder: 'editorjs',
			// ... ツール設定 ...
			data: parsedData,
			// ...
		});
		// ...
	});
</script>

<svelte:head>
	<title>Editing: {data.post.title} | {data.settings?.site_title || 'Admin'}</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 py-8">
	<form bind:this={formElement} method="POST" class="space-y-8" use:enhance={() => {
		return async ({ result, update }) => {
			// ページ全体の更新(update())を呼ぶと、エディタが再マウントされて消える場合がある
			// 成功時は update({ reset: false }) を使うか、手動で必要な処理を行う
			if (result.type === 'success') {
				isSaving = false;
				// フォームの値をリセットさせない
				await update({ reset: false });
			} else {
				await update();
				isSaving = false;
			}
		};
	}}>
		<header class="flex flex-col md:flex-row md:items-center justify-between gap-6">
			<div>
				<h2 class="text-4xl font-black tracking-tighter uppercase text-psan-green">Edit Story</h2>
				<div class="flex gap-4 mt-2">
					<select name="visibility" bind:value={visibility} class="text-xs font-black bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-500 rounded-lg px-4 py-2 uppercase tracking-widest cursor-pointer text-slate-900 dark:text-white focus:ring-2 focus:ring-psan-green shadow-sm outline-none">
						<option class="dark:bg-slate-800" value="draft">📁 Draft</option>
						<option class="dark:bg-slate-800" value="review">⏳ Review</option>
						<option class="dark:bg-slate-800" value="public">🌍 Public</option>
						<option class="dark:bg-slate-800" value="unlisted">🔗 Unlisted</option>
						<option class="dark:bg-slate-800" value="private">🔒 Private</option>
						<option class="dark:bg-slate-800" value="vip">💎 VIP</option>
					</select>
				</div>
			</div>
			<div class="flex gap-3">
				<div class="flex items-center gap-2 mr-4 px-4 border-r border-slate-100 dark:border-slate-800">
					<span class="text-[10px] font-black text-muted uppercase">Insert:</span>
					<button type="button" onclick={() => addWidget('latest-posts')} class="text-[10px] font-black px-3 py-1 bg-psan-green/10 text-psan-green rounded-full hover:bg-psan-green hover:text-white transition-all">Latest Posts</button>
					<button type="button" onclick={() => addWidget('comments')} class="text-[10px] font-black px-3 py-1 bg-psan-pink/10 text-psan-pink rounded-full hover:bg-psan-pink hover:text-white transition-all">Comments</button>
				</div>
				<a href="/dashboard/posts" class="btn-psan-ghost text-xs py-2 dark:bg-slate-700 dark:text-white dark:border-slate-500">Cancel</a>
				<button type="button" onclick={submitForm} class="btn-psan-primary py-3 px-10 text-sm" disabled={isSaving}>
					{isSaving ? 'Saving...' : 'Save Changes'}
				</button>
			</div>
		</header>

		<div class="card-psan p-6 md:p-12 space-y-8">
			<input
				id="title"
				type="text"
				name="title"
				bind:value={title}
				class="w-full text-4xl md:text-6xl font-black bg-transparent border-none focus:ring-0 p-0 text-main"
				placeholder="Title here..."
			/>

			<textarea
				id="summary"
				name="summary"
				bind:value={summary}
				rows="2"
				class="w-full text-xl font-medium bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-psan-green focus:ring-0 p-0 pb-4 text-muted"
				placeholder="Add a short summary..."
			></textarea>

			<div class="prose dark:prose-invert max-w-none min-h-[500px]">
				<div id="editorjs" class="text-main"></div>
			</div>
		</div>

		<input type="hidden" name="editorData" value={editorData} />
		{#if form?.message}<p class="text-psan-pink font-bold text-center">{form.message}</p>{/if}
	</form>
</div>
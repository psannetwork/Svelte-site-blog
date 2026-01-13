<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { editorJsToHtml } from '$lib/utils/editor';
	import { editorI18n } from '$lib/utils/editor_i18n';
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data: PageData, form: ActionData }>();
	let editor: any;
	let title = $state('');
	let summary = $state('');
	let visibility = $state('public');
	let editorData = $state('');
	let isSaving = $state(false);
	let isPreview = $state(false);
	let previewHtml = $state('');

	async function togglePreview() {
		if (!isPreview) {
			if (editor) {
				const saved = await editor.save();
				previewHtml = editorJsToHtml(saved.blocks);
			}
			isPreview = true;
		} else {
			isPreview = false;
		}
	}

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
			editorData = JSON.stringify(saved);
			setTimeout(() => {
				formElement?.requestSubmit();
			}, 50);
		} catch (err) {
			console.error('Save failed', err);
			isSaving = false;
		}
	}

	onMount(async () => {
		if (editor) return;

		const EditorJS = (await import('@editorjs/editorjs')).default;
		const Header = (await import('@editorjs/header')).default;
		const List = (await import('@editorjs/list')).default;
		const Quote = (await import('@editorjs/quote')).default;
		const Code = (await import('@editorjs/code')).default;
		const Image = (await import('@editorjs/image')).default;
		const Embed = (await import('@editorjs/embed')).default;
		const Marker = (await import('@editorjs/marker')).default;
		const Table = (await import('@editorjs/table')).default;
		const Checklist = (await import('@editorjs/checklist')).default;
		const Warning = (await import('@editorjs/warning')).default;
		const Delimiter = (await import('@editorjs/delimiter')).default;
		const InlineCode = (await import('@editorjs/inline-code')).default;
		const Underline = (await import('@editorjs/underline')).default;
		const ColorPlugin = (await import('editorjs-text-color-plugin')).default;
		const Undo = (await import('editorjs-undo')).default;
				
		editor = new EditorJS({
			holder: 'editorjs',
			i18n: data?.settings?.site_language === 'ja' ? editorI18n : undefined,
			onReady: () => {
				new Undo({ editor });
			},
			tools: {
				header: Header,
				list: List,
				quote: Quote,
				code: Code,
				marker: Marker,
				table: Table,
				checklist: Checklist,
				warning: Warning,
				delimiter: Delimiter,
				inlineCode: InlineCode,
				underline: Underline,
				color: {
					class: ColorPlugin,
					config: {
						colorCollections: ['#00CC99', '#EB2D8C', '#1A1A1A', '#FF1313', '#2388FF', '#FFD300'],
						defaultColor: '#1A1A1A',
						type: 'text',
						customPicker: true
					}
				},
				image: {
					class: Image,
					config: { 
						endpoints: { byFile: '/api/upload' },
						field: 'image',
						types: 'image/*'
					}
				},
				embed: {
					class: Embed,
					config: {
						services: {
							youtube: true,
							vimeo: true,
							twitter: true
						}
					}
				}
			},
			data: { blocks: [{ type: 'paragraph', data: { text: '' } }] },
			placeholder: 'Start writing...',
			defaultBlock: 'paragraph'
		});

		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
			if (editor && typeof editor.destroy === 'function') {
				editor.destroy();
				editor = null;
			}
		};
	});
	let formElement: HTMLFormElement;
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
	<form bind:this={formElement} method="POST" class="space-y-8" use:enhance={() => {
		return async ({ update }) => {
			await update();
			isSaving = false;
		};
	}}>
		<header class="flex flex-col md:flex-row md:items-center justify-between gap-6">
			<div>
				<h2 class="text-4xl font-black tracking-tighter text-main">CREATE STORY</h2>
				<div class="flex gap-4 mt-2">
					<select name="visibility" bind:value={visibility} class="text-xs font-black bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-lg px-4 py-2 uppercase tracking-widest cursor-pointer text-main focus:ring-2 focus:ring-psan-green shadow-sm">
						<option value="draft">📁 Draft</option>
						<option value="review">⏳ Review</option>
						<option value="public">🌍 Public</option>
						<option value="unlisted">🔗 Unlisted</option>
						<option value="private">🔒 Private</option>
						<option value="vip">💎 VIP</option>
					</select>
				</div>
			</div>
			<div class="flex gap-3">
				<a href="/dashboard/posts" class="btn-psan-ghost text-xs py-2">Discard</a>
				<button type="button" onclick={togglePreview} class="btn-psan-ghost text-xs py-2 border-psan-green text-psan-green hover:bg-psan-green hover:text-white transition-all min-w-[100px]">
					{isPreview ? 'Edit' : 'Preview'}
				</button>
				<button type="button" onclick={submitForm} class="btn-psan-primary py-3 px-10 text-sm" disabled={isSaving}>
					{isSaving ? 'Publishing...' : 'Publish'}
				</button>
			</div>
		</header>

		<div class="card-psan p-6 md:p-12 space-y-8">
			<input
				id="title"
				type="text"
				name="title"
				bind:value={title}
				class="w-full text-4xl md:text-6xl font-black bg-transparent border-none focus:ring-0 p-0 text-main placeholder:opacity-20"
				placeholder="Title here..."
			/>

			<textarea
				id="summary"
				name="summary"
				bind:value={summary}
				rows="2"
				class="w-full text-xl font-medium bg-transparent border-b border-border-color dark:border-slate-800 focus:border-psan-green focus:ring-0 p-0 pb-4 text-muted placeholder:opacity-20"
				placeholder="Add a short summary..."
			></textarea>

			<div class="prose dark:prose-invert max-w-none min-h-[500px]">
				<div id="editorjs" class="text-main {isPreview ? 'hidden' : 'block'}"></div>
				{#if isPreview}
					<div class="preview-content animate-in fade-in duration-300">
						{@html previewHtml}
					</div>
				{/if}
			</div>
		</div>

		<input type="hidden" name="editorData" value={editorData} />
		{#if form?.message}<p class="text-psan-pink font-bold text-center">{form.message}</p>{/if}
	</form>
</div>
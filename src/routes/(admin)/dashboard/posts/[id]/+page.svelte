<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { editorJsToHtml } from '$lib/utils/editor';
	import { editorI18n } from '$lib/utils/editor_i18n';
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();
	const { post: initialPost } = data;

	let editor: any;
	let formElement: HTMLFormElement;

	let title = $state(initialPost.title);
	let summary = $state(initialPost.summary || '');
	let visibility = $state(initialPost.visibility);
	let editorData = $state(initialPost.raw_json || initialPost.content || '');
	let thumbnailUrl = $state(initialPost.thumbnail_url || '');
	let isSaving = $state(false);
	let isPreview = $state(false);
	let previewHtml = $state('');
	let isUploadingThumb = $state(false);

	async function handleThumbnailUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		isUploadingThumb = true;
		const formData = new FormData();
		formData.append('image', file);
		try {
			const res = await fetch('/api/upload?type=post', { method: 'POST', body: formData });
			const result = await res.json();
			if (result.success) thumbnailUrl = result.file.url;
		} finally {
			isUploadingThumb = false;
		}
	}

	const buttonLabel = $derived.by(() => {
		if (isSaving) return 'Saving...';
		switch (visibility) {
			case 'draft':
				return 'Update Draft';
			case 'review':
				return 'Submit Review';
			case 'public':
				return 'Update & Publish';
			default:
				return 'Save Changes';
		}
	});

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
			const json = JSON.stringify(saved);
			editorData = json;

			setTimeout(() => {
				formElement?.requestSubmit();
			}, 20);
		} catch (err) {
			console.error('Save failed', err);
			isSaving = false;
		}
	}

	onMount(() => {
		(async () => {
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
			const LinkTool = (await import('@editorjs/link')).default;

			let parsedData: { blocks: any[] } = { blocks: [] };
			try {
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
				i18n: data?.settings?.site_language === 'ja' ? editorI18n : undefined,
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
							type: 'text',
							customPicker: true
						}
					},
					image: {
						class: Image,
						config: {
							endpoints: { byFile: '/api/upload' },
							field: 'image',
							types: 'image/*',
							captionPlaceholder: 'キャプションを入力...'
						}
					},
					linkTool: { class: LinkTool, config: { endpoint: '/api/link' } },
					embed: {
						class: Embed,
						config: { services: { youtube: true, vimeo: true, twitter: true } }
					}
				},
				onReady: () => {
					new Undo({ editor });
				},
				data: parsedData,
				placeholder: '執筆を開始...',
				defaultBlock: 'paragraph'
			});

			const editorContainer = document.getElementById('editorjs');
			editorContainer?.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				const target = e.target as HTMLElement;
				const block = target.closest('.ce-block');
				if (block) {
					const settingsBtn = block.querySelector('.ce-toolbar__settings-btn') as HTMLElement;
					if (settingsBtn) {
						settingsBtn.click();
					}
				}
			});
		})();

		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
			if (editor) {
				const currentEditor = editor;
				editor = null;
				if (typeof currentEditor.destroy === 'function') {
					currentEditor.isReady
						.then(() => {
							currentEditor.destroy();
						})
						.catch(() => {});
				}
			}
		};
	});
</script>

<svelte:head>
	<title>Editing: {data.post.title} | {data.settings?.site_title || 'Admin'}</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 py-8">
	<form
		bind:this={formElement}
		method="POST"
		class="space-y-8"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success') {
					isSaving = false;
					await update({ reset: false });
				} else {
					await update();
					isSaving = false;
				}
			};
		}}
	>
		<header class="flex flex-col md:flex-row md:items-center justify-between gap-6">
			<div>
				<h2 class="text-4xl font-black tracking-tighter uppercase text-psan-green">Edit Story</h2>
				<div class="flex gap-4 mt-2">
					<select
						name="visibility"
						bind:value={visibility}
						class="text-xs font-black bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-500 rounded-lg px-4 py-2 uppercase tracking-widest cursor-pointer text-slate-900 dark:text-white focus:ring-2 focus:ring-psan-green shadow-sm outline-none"
					>
						<option class="dark:bg-slate-800" value="draft">📁 Draft</option>
						<option class="dark:bg-slate-800" value="review">⏳ Review</option>
						{#if data.user?.role === 'admin' || data.user?.role === 'editor'}
							<option class="dark:bg-slate-800" value="public">🌍 Public</option>
							<option class="dark:bg-slate-800" value="unlisted">🔗 Unlisted</option>
							<option class="dark:bg-slate-800" value="private">🔒 Private</option>
							<option class="dark:bg-slate-800" value="vip">💎 VIP</option>
						{/if}
					</select>
				</div>
			</div>
			<div class="flex gap-3">
				<a
					href="/dashboard/posts"
					class="btn-psan-ghost text-xs py-2 dark:bg-slate-700 dark:text-white dark:border-slate-500"
					>Cancel</a
				>
				<button
					type="button"
					onclick={togglePreview}
					class="btn-psan-ghost text-xs py-2 border-psan-green text-psan-green hover:bg-psan-green hover:text-white transition-all min-w-[100px]"
				>
					{isPreview ? 'Edit' : 'Preview'}
				</button>
				<button
					type="button"
					onclick={submitForm}
					class="btn-psan-primary py-3 px-10 text-sm"
					disabled={isSaving}
				>
					{buttonLabel}
				</button>
			</div>
		</header>

		<div class="card-psan p-6 md:p-12 space-y-8">
			<div class="flex flex-col md:flex-row gap-8 items-start">
				<div class="w-full md:w-64 shrink-0">
					<span class="text-[10px] font-black text-muted uppercase block mb-2">Thumbnail</span>
					<div class="aspect-video rounded-2xl bg-secondary dark:bg-slate-800 overflow-hidden relative group border-2 border-dashed border-slate-200 dark:border-slate-700">
						{#if thumbnailUrl}
							<img src={thumbnailUrl} alt="Thumbnail" class="w-full h-full object-cover" />
							<button 
								type="button" 
								onclick={() => thumbnailUrl = ''} 
								class="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
							>✕</button>
						{:else}
							<label class="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
								<svg class="w-8 h-8 text-muted opacity-20 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
								<span class="text-[10px] font-black text-muted uppercase">{isUploadingThumb ? 'Uploading...' : 'Upload Image'}</span>
								<input type="file" accept="image/*" class="hidden" onchange={handleThumbnailUpload} disabled={isUploadingThumb} />
							</label>
						{/if}
					</div>
					<input type="hidden" name="thumbnail_url" value={thumbnailUrl} />
				</div>

				<div class="flex-1 space-y-6 w-full">
					<input
						id="title"
						type="text"
						name="title"
						bind:value={title}
						class="w-full text-4xl md:text-5xl font-black bg-transparent border-none focus:ring-0 p-0 text-main"
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
				</div>
			</div>

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

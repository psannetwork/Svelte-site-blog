<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { editorJsToHtml } from '$lib/utils/editor';
	import { editorI18n } from '$lib/utils/editor_i18n';
	import { t, type Language } from '$lib/i18n';
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();
	const lang = $derived((data.settings?.site_language || 'ja') as Language);

	let editor: any;
	let title = $state('');
	let summary = $state('');
	let visibility = $state('draft');
	let editorData = $state('');
	let isSaving = $state(false);
	let isPreview = $state(false);
	let previewHtml = $state('');
	let thumbnailUrl = $state('');
	let isUploadingThumb = $state(false);
	let formElement: HTMLFormElement;

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
		if (isSaving) return t(lang, 'saving');
		switch (visibility) {
			case 'draft':
				return t(lang, 'draft');
			case 'review':
				return t(lang, 'review');
			case 'public':
				return t(lang, 'public');
			case 'vip':
				return t(lang, 'vip');
			default:
				return t(lang, 'save_changes');
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
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			submitForm();
		}
	}

	function submitForm() {
		if (!editor || isSaving) return;
		formElement?.requestSubmit();
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown, true);

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
			const AlignmentTune = (await import('editorjs-text-alignment-blocktune')).default;
			const Undo = (await import('editorjs-undo')).default;
			const LinkTool = (await import('@editorjs/link')).default;
			const RawTool = (await import('@editorjs/raw')).default;
			const DragDrop = (await import('editorjs-drag-drop')).default;
			const Style = (await import('editorjs-style')).default;
			const Paragraph = (await import('@editorjs/paragraph')).default;

			let parsedData: { blocks: any[] } = { blocks: [] };
			try {
				const autosaved = localStorage.getItem('autosave_new_post');
				if (autosaved) parsedData = JSON.parse(autosaved);
			} catch (e) {}

			if (parsedData.blocks.length === 0) {
				parsedData.blocks.push({ type: 'paragraph', data: { text: '' } });
			}

			try {
				editor = new EditorJS({
					holder: 'editorjs',
					inlineToolbar: true,
					i18n: data?.settings?.site_language === 'ja' ? editorI18n : undefined,
					tools: {
						paragraph: { class: Paragraph, inlineToolbar: true },
						header: { class: Header, inlineToolbar: true },
						list: { class: List, inlineToolbar: true },
						quote: { class: Quote, inlineToolbar: true },
						code: { class: Code },
						raw: { class: RawTool, inlineToolbar: true },
						marker: {
							class: ColorPlugin,
							inlineToolbar: true,
							config: {
								type: 'marker',
								customPicker: true,
								colorCollections: [
									'#FFCC00',
									'#FF9900',
									'#FF6666',
									'#CC99FF',
									'#99CCFF',
									'#99FFCC',
									'#00CC99',
									'#CCCCCC'
								],
								colors: [
									'#FFCC00',
									'#FF9900',
									'#FF6666',
									'#CC99FF',
									'#99CCFF',
									'#99FFCC',
									'#00CC99',
									'#CCCCCC'
								],
								defaultColor: '#FFCC00'
							}
						},
						table: { class: Table, inlineToolbar: true },
						checklist: { class: Checklist, inlineToolbar: true },
						warning: { class: Warning },
						delimiter: { class: Delimiter },
						inlineCode: { class: InlineCode },
						underline: { class: Underline },
						color: {
							class: ColorPlugin,
							inlineToolbar: true,
							config: {
								type: 'text',
								customPicker: true,
								colorCollections: [
									'#000000',
									'#FF0000',
									'#0000FF',
									'#00CC99',
									'#FF00FF',
									'#0099FF',
									'#666666',
									'#FFFFFF'
								],
								colors: [
									'#000000',
									'#FF0000',
									'#0000FF',
									'#00CC99',
									'#FF00FF',
									'#0099FF',
									'#666666',
									'#FFFFFF'
								],
								defaultColor: '#FF0000'
							}
						},
						image: {
							class: Image,
							config: {
								endpoints: { byFile: '/api/upload', byUrl: '/api/upload/fetch' },
								field: 'image',
								types: 'image/*'
							}
						},
						linkTool: { class: LinkTool, config: { endpoint: '/api/link' } },
						embed: {
							class: Embed,
							config: { services: { youtube: true, vimeo: true, twitter: true } }
						},
						anyTuneName: {
							class: AlignmentTune,
							config: {
								default: 'left',
								blocks: {
									header: 'left',
									paragraph: 'left',
									quote: 'left',
									list: 'left',
									checklist: 'left'
								}
							}
						}
					},
					tunes: ['anyTuneName'],
					onReady: () => {
						// editorが初期化されていることを確認
						if (editor) {
							new Undo({ editor });
							new DragDrop(editor);
						}
					},
					onChange: () => {
						// editorが初期化されていることを確認
						if (editor) {
							debouncedAutosave();
						}
					},
					data: parsedData,
					minHeight: 400,
					placeholder: '...',
					defaultBlock: 'paragraph'
				});
			} catch (err) {
				console.error('EditorJS initialization failed:', err);
			}
		})();

		return () => {
			window.removeEventListener('keydown', handleKeydown, true);
			if (editor && typeof editor.destroy === 'function') {
				editor.destroy();
				editor = null;
			}
			debouncedAutosave.clear();
		};
	});

	function debounce<T extends (...args: any[]) => any>(func: T, timeout = 300) {
		let timer: ReturnType<typeof setTimeout>;
		const debounced = function (this: any, ...args: Parameters<T>) {
			clearTimeout(timer);
			timer = setTimeout(() => {
				func.apply(this, args);
			}, timeout);
		};
		debounced.clear = () => {
			clearTimeout(timer);
		};
		return debounced;
	}

	const debouncedAutosave = debounce(async () => {
		if (editor) {
			try {
				const saved = await editor.save();
				localStorage.setItem('autosave_new_post', JSON.stringify(saved));
			} catch (err) {
				console.error('Autosave failed:', err);
			}
		}
	}, 1000);
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
	<form
		bind:this={formElement}
		method="POST"
		class="space-y-8"
		use:enhance={async ({ formData, cancel }) => {
			if (!editor) return cancel();
			isSaving = true;
			try {
				const saved = await editor.save();
				formData.set('editorData', JSON.stringify(saved));
			} catch (err) {
				isSaving = false;
				return cancel();
			}
			return async ({ result, update }) => {
				isSaving = false;
				if (result.type === 'success' || result.type === 'redirect') {
					localStorage.removeItem('autosave_new_post');
				}
				await update({ reset: false });
			};
		}}
	>
		<header class="flex flex-col md:flex-row md:items-center justify-between gap-6">
			<div>
				<h2 class="text-4xl font-black tracking-tighter text-main uppercase leading-none">
					{t(lang, 'create_story')}
				</h2>
				<div class="flex gap-4 mt-3">
					<select
						name="visibility"
						bind:value={visibility}
						class="text-[10px] font-black bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl px-4 py-2 uppercase tracking-widest cursor-pointer text-main focus:ring-2 focus:ring-psan-green shadow-sm outline-none"
					>
						<option value="draft">📁 {t(lang, 'draft')}</option>
						<option value="review">⏳ {t(lang, 'review')}</option>
						{#if data.user?.role === 'admin' || data.user?.role === 'editor'}
							<option value="public">🌍 {t(lang, 'public')}</option>
							<option value="unlisted">🔗 {t(lang, 'unlisted')}</option>
							<option value="private">🔒 {t(lang, 'private')}</option>
							<option value="vip">💎 {t(lang, 'vip')}</option>
						{/if}
					</select>
				</div>
			</div>
			<div class="flex gap-3">
				<a href="/dashboard/posts" class="btn-psan-ghost text-xs py-2">{t(lang, 'discard')}</a>
				<button
					type="button"
					onclick={togglePreview}
					class="btn-psan-ghost text-xs py-2 border-psan-green text-psan-green hover:bg-psan-green hover:text-white transition-all min-w-[100px]"
				>
					{isPreview ? t(lang, 'edit') : t(lang, 'preview')}
				</button>
				<button type="submit" class="btn-psan-primary py-3 px-10 text-sm" disabled={isSaving}>
					{buttonLabel}
				</button>
			</div>
		</header>

		<div class="card-dashboard p-6 md:p-12 space-y-10">
			<div class="flex flex-col md:flex-row gap-10 items-start">
				<div class="w-full md:w-64 shrink-0">
					<span class="text-[10px] font-black text-muted uppercase block mb-3 tracking-widest"
						>{t(lang, 'thumbnail')}</span
					>
					<div
						class="aspect-video rounded-3xl bg-slate-50 dark:bg-slate-800 overflow-hidden relative group border-2 border-dashed border-slate-200 dark:border-slate-700"
					>
						{#if thumbnailUrl}
							<img src={thumbnailUrl} alt="" class="w-full h-full object-cover" />
							<button
								type="button"
								onclick={() => (thumbnailUrl = '')}
								class="absolute top-3 right-3 w-8 h-8 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
								>✕</button
							>
						{:else}
							<label
								class="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-psan-green/5 transition-colors"
							>
								<svg
									class="w-8 h-8 text-muted opacity-40 mb-2"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
									/></svg
								>
								<span class="text-[10px] font-black text-muted uppercase tracking-widest"
									>{isUploadingThumb ? '...' : t(lang, 'upload')}</span
								>
								<input
									type="file"
									accept="image/*"
									class="hidden"
									onchange={handleThumbnailUpload}
									disabled={isUploadingThumb}
								/>
							</label>
						{/if}
					</div>
					<input type="hidden" name="thumbnail_url" value={thumbnailUrl} />
				</div>

				<div class="flex-1 space-y-6 w-full">
					<input
						type="text"
						name="title"
						bind:value={title}
						class="w-full text-4xl md:text-5xl font-black bg-transparent border-none focus:ring-0 p-0 text-main placeholder:text-slate-200 dark:placeholder:text-slate-800 tracking-tighter"
						placeholder={t(lang, 'title')}
					/>
					<textarea
						name="summary"
						bind:value={summary}
						rows="2"
						class="w-full text-xl font-bold bg-transparent border-none focus:ring-0 p-0 text-muted placeholder:text-slate-200 dark:placeholder:text-slate-800 resize-none"
						placeholder={t(lang, 'summary')}
					></textarea>
				</div>
			</div>

			<div class="editor-container-psan min-h-[500px]">
				<div id="editorjs" class="text-main {isPreview ? 'hidden' : 'block'}"></div>
				{#if isPreview}
					<div
						class="prose dark:prose-invert max-w-none preview-content animate-in fade-in duration-300"
					>
						{@html previewHtml}
					</div>
				{/if}
			</div>
		</div>

		<input type="hidden" name="editorData" value={editorData} />
		{#if form?.message}<p class="text-psan-pink font-bold text-center">{form.message}</p>{/if}
	</form>
</div>

<script lang="ts">
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import RichEditor from '$lib/components/RichEditor.svelte';
  import VersionControl from '$lib/components/VersionControl.svelte';
  import { t, type Language } from '$lib/i18n';
  import type { ActionData, PageData } from './$types';

  let { data, form } = $props<{ data: PageData; form: ActionData }>();
  const lang = $derived((data.settings?.site_language || 'ja') as Language);

  let formElement: HTMLFormElement;

  let initialPost = $state<any>(null);
  let title = $state('');
  let summary = $state('');
  let visibility = $state('draft');
  let editorHtml = $state('');
  let thumbnailUrl = $state('');
  let isSaving = $state(false);
  let isPreview = $state(false);
  let isUploadingThumb = $state(false);

  $effect(() => {
    if (data.post && !initialPost) {
      initialPost = $state.snapshot(data.post);
      title = initialPost.title;
      summary = initialPost.summary || '';
      visibility = initialPost.visibility;
      // HTML コンテンツを抽出
      editorHtml = initialPost.content || '';
      thumbnailUrl = initialPost.thumbnail_url || '';
    }
  });

  const buttonLabel = $derived.by(() => {
    if (isSaving) return t(lang, 'saving');
    switch (visibility) {
      case 'draft':
        return t(lang, 'draft');
      case 'review':
        return t(lang, 'review');
      case 'public':
        return t(lang, 'public');
      default:
        return t(lang, 'save_changes');
    }
  });

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

  async function handleImageUploadInEditor({ file }: { file: File }) {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/api/upload?type=post', { method: 'POST', body: formData });
      const result = await res.json();
      if (result.success) {
        return result.file.url;
      } else {
        console.error('Image upload failed:', result.message);
        throw new Error(result.message || 'Image upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  function submitForm() {
    if (isSaving) return;
    formElement?.requestSubmit();
  }

  async function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      submitForm();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown, true);
    return () => {
      window.removeEventListener('keydown', handleKeydown, true);
    };
  });
</script>

<svelte:head>
  <title>{t(lang, 'edit_story')}: {title} | {data.settings?.site_title || 'Admin'}</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 py-8">
  <form
    bind:this={formElement}
    method="POST"
    class="space-y-8"
    use:enhance={async ({ formData, cancel }) => {
      isSaving = true;
      return async ({ result, update }) => {
        isSaving = false;
        if (result.type === 'success' || result.type === 'redirect') {
          localStorage.removeItem(`autosave_post_${initialPost?.id}`);
        }
        await update({ reset: false });
      };
    }}
  >
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h2 class="text-4xl font-black tracking-tighter uppercase text-psan-green leading-none">
          {t(lang, 'edit_story')}
        </h2>
        <div class="flex gap-4 mt-3">
          <select
            name="visibility"
            bind:value={visibility}
            class="text-[10px] font-black bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-500 rounded-xl px-4 py-2 uppercase tracking-widest cursor-pointer text-main focus:ring-2 focus:ring-psan-green shadow-sm outline-none"
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
        <a href="/dashboard/posts" class="btn-psan-ghost text-xs py-2">{t(lang, 'cancel')}</a>
        <button
          type="button"
          onclick={() => (isPreview = !isPreview)}
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
        {#if !isPreview}
          <RichEditor
            value={editorHtml}
            placeholder="コンテンツを入力してください..."
            onchange={(html) => (editorHtml = html)}
          />
        {:else}
          <div
            class="prose dark:prose-invert max-w-none preview-content animate-in fade-in duration-300 p-4 border rounded-lg bg-white dark:bg-slate-800"
          >
            {@html editorHtml}
          </div>
        {/if}
      </div>
    </div>

    <input type="hidden" name="editorHtml" value={editorHtml} />
    {#if form?.message}<p class="text-psan-pink font-bold text-center">{form.message}</p>{/if}
  </form>
</div>



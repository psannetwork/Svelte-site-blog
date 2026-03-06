<script lang="ts">
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import RichEditor from '$lib/components/RichEditor.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form } = $props<{ data: PageData; form: ActionData }>();

  let formElement: HTMLFormElement;

  let title = $state('');
  let editorHtml = $state('');
  let isSaving = $state(false);

  $effect(() => {
    if (data.page && title === '') {
      title = data.page.title;
      editorHtml = data.page.content || '';
    }
  });

  async function handleImageUploadInEditor({ file }: { file: File }) {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/api/upload?type=page', { method: 'POST', body: formData });
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
  <title>Edit Page: {title} | {data.settings?.site_title || 'Admin'}</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 py-8">
  <form
    bind:this={formElement}
    method="POST"
    action="?/savePage"
    class="space-y-8"
    use:enhance={async ({ formData, cancel }) => {
      isSaving = true;
      return async ({ result, update }) => {
        isSaving = false;
        if (result.type === 'success' || result.type === 'redirect') {
          // グローバル通知を表示
          window.dispatchEvent(new CustomEvent('notify', { 
            detail: { message: 'ページを保存しました', type: 'success' } 
          }));
        }
        await update({ reset: false });
      };
    }}
  >
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h2 class="text-4xl font-black tracking-tighter uppercase text-psan-green">Edit Page</h2>
        <p class="text-xs text-muted font-bold mt-1 uppercase tracking-widest">
          ID: {data.page.id}
        </p>
      </div>
      <div class="flex gap-3">
        <a
          href="/dashboard/pages"
          class="btn-psan-ghost text-xs py-2 dark:bg-slate-700 dark:text-white dark:border-slate-500"
          >Back</a
        >
        <button
          type="button"
          onclick={() => console.log('preview')}
          class="btn-psan-ghost text-xs py-2 border-psan-green text-psan-green hover:bg-psan-green hover:text-psan-green-fg transition-all min-w-[100px]"
        >
          Preview
        </button>
        <button type="submit" class="btn-psan-primary py-3 px-10 text-sm">
          Save Changes
        </button>
      </div>
    </header>

    <div class="card-psan p-6 md:p-12 space-y-8">
      <input
        id="title"
        type="text"
        name="title"
        bind:value={title}
        class="w-full text-4xl md:text-6xl font-black bg-transparent border-none focus:ring-0 p-0 text-main placeholder:text-muted/20 tracking-tighter"
        placeholder="Page Title..."
      />

      <div class="editor-container-psan min-h-[500px]">
        <RichEditor
          value={editorHtml}
          placeholder="Build your page content..."
          onchange={(markdown) => (editorHtml = markdown)}
        />
      </div>
    </div>

    <input type="hidden" name="content" value={editorHtml} />
  </form>
</div>



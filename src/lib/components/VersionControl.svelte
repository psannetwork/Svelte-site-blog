<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	export interface Version {
		id: string;
		post_id: string;
		version: number;
		content: string;
		author_id: string;
		username?: string;
		created_at: number;
		parent_version: number;
		commit_message?: string;
	}

	export interface Collaborator {
		user_id: string;
		username: string;
		last_activity: number;
		cursor_position: number;
		selection_start: number;
		selection_end: number;
	}

	interface Props {
		postId: string;
		currentContent: string;
		onContentChange?: (content: string, version: number) => void;
		currentUserId?: string;
	}

	let { postId, currentContent, onContentChange, currentUserId }: Props = $props();

	let versions = $state<Version[]>([]);
	let collaborators = $state<Collaborator[]>([]);
	let currentVersion = $state(0);
	let isSaving = $state(false);
	let showVersionPanel = $state(false);
	let commitMessage = $state('');
	let selectedVersion = $state<Version | null>(null);
	let localContent = $state(currentContent);

	// currentContent の変更を同期
	$effect(() => {
		if (browser && currentContent) {
			localContent = currentContent;
		}
	});

	let pollInterval: ReturnType<typeof setInterval>;
	let saveTimeout: ReturnType<typeof setTimeout>;

	onMount(async () => {
		if (!browser) return;

		await loadVersions();
		await loadCollaborators();

		// 定期更新
		pollInterval = setInterval(() => {
			loadCollaborators();
			checkForUpdates();
		}, 5000);

		// 編集中ユーザーとして登録
		updatePresence();
	});

	onDestroy(() => {
		if (!browser) return;
		clearInterval(pollInterval);
		clearTimeout(saveTimeout);
		leaveCollaboration();
	});

	async function loadVersions() {
		if (!browser) return;
		try {
			const res = await fetch(`/api/versions?post=${postId}`);
			const data = await res.json();
			versions = data.versions || [];
			currentVersion = versions[0]?.version || 0;
		} catch (e) {
			console.error('Failed to load versions:', e);
		}
	}

	async function loadCollaborators() {
		if (!browser) return;
		try {
			const res = await fetch(`/api/collaboration?post=${postId}`);
			const data = await res.json();
			collaborators = data.collaborators || [];
		} catch (e) {
			console.error('Failed to load collaborators:', e);
		}
	}

	async function updatePresence(cursorPosition = 0, selectionStart = 0, selectionEnd = 0) {
		if (!browser) return;
		try {
			await fetch('/api/collaboration', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					postId,
					cursorPosition,
					selectionStart,
					selectionEnd
				})
			});
		} catch (e) {
			console.error('Failed to update presence:', e);
		}
	}

	async function leaveCollaboration() {
		if (!browser) return;
		try {
			await fetch('/api/collaboration', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId })
			});
		} catch (e) {
			console.error('Failed to leave collaboration:', e);
		}
	}

	async function saveVersion(message?: string) {
		if (!browser || isSaving) return;

		isSaving = true;
		const msg = message || commitMessage || `Version ${currentVersion + 1}`;

		try {
			const res = await fetch('/api/versions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					postId,
					content: localContent,
					parentVersion: currentVersion,
					commitMessage: msg
				})
			});

			const data = await res.json();
			if (data.success) {
				currentVersion = data.version;
				commitMessage = '';
				await loadVersions();

				if (onContentChange) {
					onContentChange(localContent, data.version);
				}
			}
		} catch (e) {
			console.error('Failed to save version:', e);
		} finally {
			isSaving = false;
		}
	}

	async function loadVersion(version: Version) {
		selectedVersion = version;
		localContent = version.content;
	}

	async function restoreVersion(version: Version) {
		if (!confirm(`バージョン ${version.version} に復元しますか？`)) return;

		localContent = version.content;
		if (onContentChange) {
			onContentChange(version.content, currentVersion + 1);
		}

		// 新規バージョンとして保存
		await saveVersion(`Restore from version ${version.version}`);
		showVersionPanel = false;
		selectedVersion = null;
	}

	async function checkForUpdates() {
		if (!browser) return;
		try {
			const res = await fetch(`/api/versions?post=${postId}`);
			const data = await res.json();
			const latestVersion = data.versions?.[0];

			if (latestVersion && latestVersion.version > currentVersion) {
				// 新規バージョンがあるが、自動では適用しない
				console.log('New version available:', latestVersion.version);
			}
		} catch (e) {
			console.error('Failed to check for updates:', e);
		}
	}

	function handleContentChange(content: string) {
		localContent = content;

		// 自動保存（30 秒後）
		clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => {
			saveVersion('Auto-save');
		}, 30000);
	}

	function handleCursorUpdate(position: number, start: number, end: number) {
		updatePresence(position, start, end);
	}

	function getVersionColor(version: Version) {
		if (version.version === currentVersion) return 'bg-green-100 text-green-800';
		if (version === selectedVersion) return 'bg-blue-100 text-blue-800';
		return 'bg-gray-100 text-gray-800';
	}

	function formatDate(timestamp: number) {
		return new Date(timestamp).toLocaleString('ja-JP');
	}
</script>

<div class="relative">
	<!-- コラボレーション表示 -->
	{#if collaborators.length > 1}
		<div class="flex items-center gap-2 mb-4 p-2 bg-blue-50 rounded-lg">
			<span class="text-sm font-medium text-blue-800">編集中:</span>
			<div class="flex -space-x-2">
				{#each collaborators.filter(c => c.user_id !== currentUserId) as collaborator}
					<div
						class="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white"
						title={collaborator.username}
					>
						{collaborator.username.charAt(0).toUpperCase()}
					</div>
				{/each}
			</div>
			<span class="text-xs text-blue-600">
				{collaborators.length - 1}人が編集中
			</span>
		</div>
	{/if}

	<!-- バージョン管理パネル -->
	<div class="mb-4 flex items-center gap-2">
		<button
			type="button"
			onclick={() => (showVersionPanel = !showVersionPanel)}
			class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
		>
			バージョン履歴 ({versions.length})
		</button>

		<button
			type="button"
			onclick={() => saveVersion()}
			disabled={isSaving}
			class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 disabled:opacity-50"
		>
			{isSaving ? '保存中...' : '保存'}
		</button>

		{#if currentVersion > 0}
			<span class="text-sm text-gray-500">v{currentVersion}</span>
		{/if}
	</div>

	<!-- バージョンパネル -->
	{#if showVersionPanel}
		<div class="mb-4 border border-gray-200 rounded-lg bg-white max-h-96 overflow-y-auto">
			<div class="p-4 border-b border-gray-200">
				<h3 class="font-semibold text-gray-900">バージョン履歴</h3>
			</div>
			<div class="divide-y divide-gray-200">
				{#each versions as version}
					<div
						class="p-3 hover:bg-gray-50 cursor-pointer {getVersionColor(version)}"
						onclick={() => loadVersion(version)}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') loadVersion(version); }}
						role="button"
						tabindex="0"
						aria-label={`Load version ${version.version}`}
					>
						<div class="flex items-center justify-between">
							<div>
								<span class="font-medium">v{version.version}</span>
								{#if version.version === currentVersion}
									<span class="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded">現在</span>
								{/if}
							</div>
							<span class="text-xs text-gray-500">{formatDate(version.created_at)}</span>
						</div>
						{#if version.commit_message}
							<p class="text-sm text-gray-600 mt-1">{version.commit_message}</p>
						{/if}
						<p class="text-xs text-gray-400 mt-1">by {version.username || 'Unknown'}</p>

						{#if selectedVersion === version && version.version !== currentVersion}
							<div class="mt-2 flex gap-2">
								<button
									type="button"
									onclick={(e) => {
										e.stopPropagation();
										restoreVersion(version);
									}}
									class="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
								>
									このバージョンを復元
								</button>
								<button
									type="button"
									onclick={(e) => {
										e.stopPropagation();
										showVersionPanel = false;
										selectedVersion = null;
									}}
									class="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
								>
									閉じる
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- 自動保存インジケーター -->
	{#if isSaving}
		<div class="absolute top-2 right-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded">
			保存中...
		</div>
	{/if}
</div>

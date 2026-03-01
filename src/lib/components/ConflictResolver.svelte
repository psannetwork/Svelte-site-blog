<script lang="ts">
	import DiffViewer from './DiffViewer.svelte';

	interface Props {
		baseContent: string;
		remoteContent: string;
		localContent: string;
		onResolve: (content: string) => void;
		onCancel: () => void;
	}

	let { baseContent, remoteContent, localContent, onResolve, onCancel }: Props = $props();

	let resolvedContent = $state(localContent);
	let mergeStrategy = $state<'manual' | 'useLocal' | 'useRemote'>('manual');

	// 競合検出
	const hasConflict = $derived(baseContent !== remoteContent && baseContent !== localContent);

	function computeThreeWayDiff() {
		// 簡易的な 3 方向差分
		const baseLines = baseContent.split('\n');
		const remoteLines = remoteContent.split('\n');
		const localLines = localContent.split('\n');

		const conflicts: Array<{
			line: number;
			base: string;
			remote: string;
			local: string;
		}> = [];

		const maxLen = Math.max(baseLines.length, remoteLines.length, localLines.length);

		for (let i = 0; i < maxLen; i++) {
			const base = baseLines[i] || '';
			const remote = remoteLines[i] || '';
			const local = localLines[i] || '';

			if (base !== remote || base !== local) {
				conflicts.push({ line: i + 1, base, remote, local });
			}
		}

		return conflicts;
	}

	const conflicts = $derived(computeThreeWayDiff());

	function useLocal() {
		resolvedContent = localContent;
		mergeStrategy = 'useLocal';
	}

	function useRemote() {
		resolvedContent = remoteContent;
		mergeStrategy = 'useRemote';
	}

	function mergeBoth() {
		// 両方を結合（簡易実装）
		resolvedContent = localContent + '\n\n--- Merged from remote ---\n\n' + remoteContent;
		mergeStrategy = 'manual';
	}

	function handleResolve() {
		onResolve(resolvedContent);
	}
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
	<div class="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
		<!-- Header -->
		<div class="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold text-gray-900">競合の解決</h2>
					<p class="text-sm text-gray-600 mt-1">
						{conflicts.length}箇所の競合を検出しました
					</p>
				</div>
				<button
					type="button"
					onclick={onCancel}
					class="text-gray-400 hover:text-gray-600"
					aria-label="Close"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Content -->
		<div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
			<!-- 競合一覧 -->
			{#if conflicts.length > 0}
				<div class="mb-6 space-y-4">
					<h3 class="font-semibold text-gray-900">競合箇所</h3>
					{#each conflicts.slice(0, 10) as conflict}
						<div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
							<div class="text-xs font-mono text-gray-500 mb-2">Line {conflict.line}</div>
							<div class="grid grid-cols-3 gap-4">
								<div>
									<div class="text-xs font-semibold text-gray-600 mb-1">Base</div>
									<div class="text-sm font-mono bg-white p-2 rounded border">{conflict.base || '(empty)'}</div>
								</div>
								<div>
									<div class="text-xs font-semibold text-red-600 mb-1">Remote</div>
									<div class="text-sm font-mono bg-red-50 p-2 rounded border border-red-200">{conflict.remote || '(empty)'}</div>
								</div>
								<div>
									<div class="text-xs font-semibold text-blue-600 mb-1">Local</div>
									<div class="text-sm font-mono bg-blue-50 p-2 rounded border border-blue-200">{conflict.local || '(empty)'}</div>
								</div>
							</div>
						</div>
					{/each}
					{#if conflicts.length > 10}
						<p class="text-sm text-gray-500 text-center">他 {conflicts.length - 10} 箇所...</p>
					{/if}
				</div>
			{/if}

			<!-- 解決方法 -->
			<div class="mb-6">
				<h3 class="font-semibold text-gray-900 mb-4">解決方法</h3>

				<div class="grid grid-cols-3 gap-4">
					<button
						type="button"
						onclick={useLocal}
						class="p-4 border-2 rounded-lg hover:bg-blue-50 transition-colors {mergeStrategy === 'useLocal' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}"
					>
						<div class="font-semibold text-blue-700">ローカルを採用</div>
						<div class="text-sm text-gray-600 mt-1">あなたの変更を優先</div>
					</button>

					<button
						type="button"
						onclick={useRemote}
						class="p-4 border-2 rounded-lg hover:bg-red-50 transition-colors {mergeStrategy === 'useRemote' ? 'border-red-500 bg-red-50' : 'border-gray-200'}"
					>
						<div class="font-semibold text-red-700">リモートを採用</div>
						<div class="text-sm text-gray-600 mt-1">他ユーザーの変更を優先</div>
					</button>

					<button
						type="button"
						onclick={mergeBoth}
						class="p-4 border-2 rounded-lg hover:bg-green-50 transition-colors {mergeStrategy === 'manual' ? 'border-green-500 bg-green-50' : 'border-gray-200'}"
					>
						<div class="font-semibold text-green-700">両方を結合</div>
						<div class="text-sm text-gray-600 mt-1">手動で編集可能</div>
					</button>
				</div>
			</div>

			<!-- 差分ビューワー -->
			<div class="mb-6">
				<h3 class="font-semibold text-gray-900 mb-4">差分確認</h3>
				<DiffViewer
					oldContent={baseContent}
					newContent={resolvedContent}
					oldLabel="Base"
					newLabel="Resolved"
				/>
			</div>

			<!-- 編集エリア -->
			<div>
				<h3 class="font-semibold text-gray-900 mb-4">結果を編集</h3>
				<textarea
					bind:value={resolvedContent}
					class="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					placeholder="解決後のコンテンツを入力..."
				></textarea>
			</div>
		</div>

		<!-- Footer -->
		<div class="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
			<button
				type="button"
				onclick={onCancel}
				class="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
			>
				キャンセル
			</button>
			<button
				type="button"
				onclick={handleResolve}
				class="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
			>
				競合を解決して保存
			</button>
		</div>
	</div>
</div>

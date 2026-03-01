<script lang="ts">
	interface Props {
		oldContent: string;
		newContent: string;
		oldLabel?: string;
		newLabel?: string;
	}

	let {
		oldContent = '',
		newContent = '',
		oldLabel = 'Before',
		newLabel = 'After'
	}: Props = $props();

	function computeDiff(oldText: string, newText: string) {
		const oldLines = oldText.split('\n');
		const newLines = newText.split('\n');

		const diff: Array<{ type: 'same' | 'added' | 'removed'; content: string }> = [];
		const maxLen = Math.max(oldLines.length, newLines.length);

		// 簡易的な差分アルゴリズム
		let oldIndex = 0;
		let newIndex = 0;

		while (oldIndex < oldLines.length || newIndex < newLines.length) {
			if (oldIndex >= oldLines.length) {
				// 新規追加
				diff.push({ type: 'added', content: newLines[newIndex] });
				newIndex++;
			} else if (newIndex >= newLines.length) {
				// 削除
				diff.push({ type: 'removed', content: oldLines[oldIndex] });
				oldIndex++;
			} else if (oldLines[oldIndex] === newLines[newIndex]) {
				// 同じ
				diff.push({ type: 'same', content: oldLines[oldIndex] });
				oldIndex++;
				newIndex++;
			} else {
				// 変更を検出
				// 削除としてマーク
				diff.push({ type: 'removed', content: oldLines[oldIndex] });
				oldIndex++;
			}
		}

		return diff;
	}

	const diffs = $derived(computeDiff(oldContent, newContent));

	function getDiffClass(type: string) {
		switch (type) {
			case 'added':
				return 'bg-green-100 text-green-800 border-l-4 border-green-500';
			case 'removed':
				return 'bg-red-100 text-red-800 border-l-4 border-red-500 line-through opacity-70';
			default:
				return 'bg-white';
		}
	}
</script>

<div class="diff-viewer border border-gray-200 rounded-lg overflow-hidden">
	<div class="flex border-b border-gray-200 bg-gray-50">
		<div class="flex-1 p-3 text-sm font-semibold text-gray-700 text-center border-r border-gray-200">
			{oldLabel}
		</div>
		<div class="flex-1 p-3 text-sm font-semibold text-gray-700 text-center">
			{newLabel}
		</div>
	</div>

	<div class="flex max-h-[600px] overflow-auto">
		<!-- 古いコンテンツ -->
		<div class="flex-1 border-r border-gray-200 p-4 font-mono text-sm bg-gray-50">
			{#each diffs as diff, i}
				{#if diff.type === 'removed' || diff.type === 'same'}
					<div class="py-0.5 px-2 {diff.type === 'removed' ? 'bg-red-100 line-through text-red-800' : ''}">
						<span class="text-gray-400 select-none w-8 inline-block text-right mr-2">{i + 1}</span>
						{diff.content}
					</div>
				{/if}
			{/each}
		</div>

		<!-- 新しいコンテンツ -->
		<div class="flex-1 p-4 font-mono text-sm">
			{#each diffs as diff, i}
				{#if diff.type === 'added' || diff.type === 'same'}
					<div class="py-0.5 px-2 {diff.type === 'added' ? 'bg-green-100 text-green-800' : ''}">
						<span class="text-gray-400 select-none w-8 inline-block text-right mr-2">{i + 1}</span>
						{diff.content}
					</div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- 凡例 -->
	<div class="flex gap-4 p-3 bg-gray-50 border-t border-gray-200 text-xs">
		<div class="flex items-center gap-2">
			<div class="w-4 h-4 bg-green-100 border border-green-300"></div>
			<span>追加</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="w-4 h-4 bg-red-100 border border-red-300"></div>
			<span>削除</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="w-4 h-4 bg-white border border-gray-300"></div>
			<span>変更なし</span>
		</div>
	</div>
</div>

<style>
	.diff-viewer {
		font-family: 'Fira Code', 'Consolas', monospace;
	}

	.diff-viewer :global(.line-through) {
		text-decoration: line-through;
	}
</style>

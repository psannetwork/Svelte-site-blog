<script lang="ts">
	interface Props {
		position: { x: number; y: number };
		onSelect: (color: string, mode: 'auto' | 'fixed') => void;
		onClose: () => void;
	}

	let { position, onSelect, onClose }: Props = $props();

	let selectedColor = $state('#000000');
	let colorMode = $state<'auto' | 'fixed'>('auto');

	const colorNames: Record<string, string> = {
		'#000000': '黒',
		'#434343': '濃灰',
		'#666666': '灰',
		'#999999': '銀',
		'#b7b7b7': '薄銀',
		'#cccccc': '淡灰',
		'#d9d9d9': '白灰',
		'#efefef': '煙白',
		'#f3f3f3': '白煙',
		'#ffffff': '白',
		'#980000': '赤茶',
		'#ff0000': '赤',
		'#ff9900': '橙',
		'#ffff00': '黄',
		'#00ff00': '緑',
		'#00ffff': '水',
		'#4a86e8': '青',
		'#0000ff': '紺',
		'#9900ff': '紫',
		'#ff00ff': '桃'
	};

	const colorPalette = [
		'#000000',
		'#434343',
		'#666666',
		'#999999',
		'#b7b7b7',
		'#cccccc',
		'#d9d9d9',
		'#efefef',
		'#f3f3f3',
		'#ffffff',
		'#980000',
		'#ff0000',
		'#ff9900',
		'#ffff00',
		'#00ff00',
		'#00ffff',
		'#4a86e8',
		'#0000ff',
		'#9900ff',
		'#ff00ff'
	];

	function handleColorSelect(color: string) {
		selectedColor = color;
		onSelect(color, colorMode);
	}

	function handleModeToggle() {
		colorMode = colorMode === 'auto' ? 'fixed' : 'auto';
		if (selectedColor) {
			onSelect(selectedColor, colorMode);
		}
	}
</script>

<div class="color-picker" style="left: {position.x}px; top: {position.y}px;">
	<div class="mode-toggle">
		<label class="toggle-label">
			<input
				type="checkbox"
				checked={colorMode === 'auto'}
				onchange={handleModeToggle}
			/>
			<span class="toggle-text">
				{colorMode === 'auto' ? '🌙 ダークで最適化' : '🔒 色を固定'}
			</span>
		</label>
		<div class="mode-description">
			{colorMode === 'auto'
				? 'ダークモード時に自動で明度を調整します'
				: '常に指定した色を維持します（ロゴ等）'}
		</div>
	</div>

	<div class="color-grid">
		{#each colorPalette as color}
			<button
				class="color-swatch"
				class:selected={selectedColor === color}
				style="background: {color}"
				title="{colorNames[color] || color}"
				onclick={() => handleColorSelect(color)}
			></button>
		{/each}
	</div>

	<div class="custom-color">
		<label for="custom-color-input">カスタム：</label>
		<input
			id="custom-color-input"
			type="color"
			bind:value={selectedColor}
			oninput={() => onSelect(selectedColor, colorMode)}
		/>
	</div>
</div>

<style>
	.color-picker {
		position: absolute;
		background: white;
		border: 1px solid #e2e8f0;
		padding: 12px;
		border-radius: 8px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		z-index: 1000;
		min-width: 220px;
	}
	:global(.dark) .color-picker {
		background: #1e293b;
		border-color: #334155;
	}

	.mode-toggle {
		margin-bottom: 12px;
		padding-bottom: 12px;
		border-bottom: 1px solid #e2e8f0;
	}
	:global(.dark) .mode-toggle {
		border-bottom-color: #334155;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		font-size: 14px;
		color: #334155;
	}
	:global(.dark) .toggle-label {
		color: #e2e8f0;
	}

	.toggle-label input[type='checkbox'] {
		width: 18px;
		height: 18px;
		cursor: pointer;
		accent-color: #3b82f6;
	}

	.toggle-text {
		font-weight: 500;
	}

	.mode-description {
		margin-top: 4px;
		font-size: 12px;
		color: #64748b;
		padding-left: 26px;
	}
	:global(.dark) .mode-description {
		color: #94a3b8;
	}

	.color-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 6px;
		margin-bottom: 12px;
	}

	.color-swatch {
		width: 32px;
		height: 32px;
		border-radius: 4px;
		border: 2px solid #e2e8f0;
		cursor: pointer;
		transition: all 0.2s;
	}

	.color-swatch:hover {
		transform: scale(1.1);
		border-color: #94a3b8;
	}

	.color-swatch.selected {
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
	}

	.custom-color {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: #64748b;
	}
	:global(.dark) .custom-color {
		color: #94a3b8;
	}

	.custom-color input[type='color'] {
		width: 40px;
		height: 32px;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		cursor: pointer;
		padding: 2px;
	}
</style>

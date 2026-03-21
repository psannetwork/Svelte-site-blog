/**
 * HEX → HSL 変換
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0,
		s = 0,
		l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h *= 60;
	}

	return { h, s: s * 100, l: l * 100 };
}

/**
 * HSL → HEX 変換
 */
export function hslToHex({ h, s, l }: { h: number; s: number; l: number }): string {
	s /= 100;
	l /= 100;

	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;

	let r = 0,
		g = 0,
		b = 0;

	if (h < 60) [r, g, b] = [c, x, 0];
	else if (h < 120) [r, g, b] = [x, c, 0];
	else if (h < 180) [r, g, b] = [0, c, x];
	else if (h < 240) [r, g, b] = [0, x, c];
	else if (h < 300) [r, g, b] = [x, 0, c];
	else [r, g, b] = [c, 0, x];

	const toHex = (v: number) =>
		Math.round((v + m) * 255)
			.toString(16)
			.padStart(2, '0');

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * ダークモード用色補正
 * - 色相は絶対に変えない
 * - 明度を反転＋調整
 * - 彩度は上限 70% に抑制
 * - 黒と白は例外としてそのまま
 */
export function adaptForDark(hsl: { h: number; s: number; l: number }): { h: number; s: number; l: number } {
	// 黒（l < 5）はそのまま黒を維持
	if (hsl.l < 5) {
		return { h: hsl.h, s: hsl.s, l: 0 };
	}
	// 白（l > 95）はそのまま白を維持
	if (hsl.l > 95) {
		return { h: hsl.h, s: hsl.s, l: 100 };
	}
	return {
		h: hsl.h,
		s: Math.min(hsl.s, 70),
		l: Math.min(90, Math.max(100 - hsl.l, 30))
	};
}

/**
 * コントラスト保証（最終調整）
 * 背景との明度差を 30 以上確保
 */
export function ensureContrast(
	hsl: { h: number; s: number; l: number },
	bgL: number = 10
): { h: number; s: number; l: number } {
	if (Math.abs(hsl.l - bgL) < 30) {
		hsl.l = bgL > 50 ? bgL - 30 : bgL + 30;
	}
	return hsl;
}

/**
 * ハイブリッド配色の最終色を計算
 * @param baseColor - 編集者が指定した色（ライト基準）
 * @param mode - 'auto' | 'fixed'
 * @param isDark - ダークモードかどうか
 */
export function computeFinalColor(
	baseColor: string,
	mode: 'auto' | 'fixed',
	isDark: boolean
): string {
	let hsl = hexToHsl(baseColor);

	// fixed モードまたはライトモードならそのまま
	if (mode === 'fixed' || !isDark) {
		return hslToHex(hsl);
	}

	// ダークモードで auto の場合、補正を適用
	hsl = adaptForDark(hsl);

	return hslToHex(hsl);
}

/**
 * インラインスタイルの色を HEX に変換
 */
function inlineColorToHex(color: string): string | null {
	if (!color) return null;
	
	// HEX 形式
	if (color.startsWith('#')) {
		return color.length === 4 ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}` : color;
	}
	
	// RGB/RGBA 形式
	const rgbMatch = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
	if (rgbMatch) {
		const r = parseInt(rgbMatch[1]);
		const g = parseInt(rgbMatch[2]);
		const b = parseInt(rgbMatch[3]);
		return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
	}
	
	return null;
}

/**
 * 色が暗い色かどうかを判定（明度 50% 未満）
 */
function isDarkColor(hex: string): boolean {
	const hsl = hexToHsl(hex);
	return hsl.l < 50;
}

/**
 * 暗い色を明るい色に変換
 */
function invertDarkColor(hex: string): string {
	const hsl = hexToHsl(hex);
	// 明度を反転（暗い→明るい）
	return hslToHex({
		h: hsl.h,
		s: Math.min(hsl.s, 70),
		l: Math.min(90, Math.max(100 - hsl.l, 30))
	});
}

/**
 * 要素に色を適用する
 * @param el - 対象要素
 * @param isDark - ダークモードかどうか
 */
export function applyColorToElement(el: HTMLElement, isDark: boolean): void {
	// code / pre は適用除外
	if (el.closest('code, pre')) return;

	// contenteditable 内（編集中）は適用除外 - 編集体験を損なわない
	if (el.closest('[contenteditable="true"]')) return;

	const mode = (el.getAttribute('data-color-mode') as 'auto' | 'fixed') || 'auto';
	
	// fixed モードまたはライトモードならそのまま
	if (mode === 'fixed' || !isDark) return;

	// data-color 属性がある場合はそれを使用
	let baseColor = el.getAttribute('data-color');
	
	// data-color がない場合はインラインスタイルから取得
	if (!baseColor) {
		const inlineColor = el.style.color;
		baseColor = inlineColorToHex(inlineColor);
	}
	
	if (!baseColor) return;

	// 暗い色（黒系）のみを明るい色に変換
	if (isDarkColor(baseColor)) {
		const finalColor = invertDarkColor(baseColor);
		el.style.setProperty('color', finalColor, 'important');
	}
}

/**
 * コンテナ内の全ての color 要素に適用
 * @param container - 対象コンテナ
 * @param isDark - ダークモードかどうか
 */
export function applyColors(container: HTMLElement, isDark: boolean): void {
	// data-color 属性付き要素
	const elements = container.querySelectorAll('[data-color]');
	elements.forEach((el) => {
		applyColorToElement(el as HTMLElement, isDark);
	});
	
	// インラインスタイルで色が設定された要素も処理
	const inlineElements = container.querySelectorAll('[style*="color"]');
	inlineElements.forEach((el) => {
		applyColorToElement(el as HTMLElement, isDark);
	});
}

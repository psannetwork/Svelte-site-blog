import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			precompress: true
		}),
		csrf: {
			// Cloudflare Tunnelやプロキシ環境でのPOSTエラーを確実に回避するため、
			// 非推奨ですがオリジンチェックを無効化します。
			checkOrigin: false
		}
	}
};

export default config;

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
			// プレビュー環境やプロキシ環境でのPOSTエラーを防ぐため、既知のオリジンを許可
			checkOrigin: true,
			trustedOrigins: [
				'http://localhost:5173',
				'http://localhost:5174',
				'http://localhost:5892',
				'https://blogtest.psannetwork.net',
				'https://blog.psannetwork.net'
			]
		}
	}
};

export default config;

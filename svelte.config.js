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
			// CSRF 保護を有効化
			trustedOrigins: [
				'localhost',
				'127.0.0.1',
				'http://localhost:5173',
				'http://127.0.0.1:5173',
				'http://localhost:5174',
				'http://127.0.0.1:5174',
				'https://blog.psannetwork.net',
				'https://blogtest.psannetwork.net',
				'http://blog.psannetwork.net',
				'http://blogtest.psannetwork.net'
			]
		}
	}
};

export default config;

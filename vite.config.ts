import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    port: parseInt(process.env.PORT || '5174', 10),
    strictPort: process.env.STRICT_PORT === 'true',
    host: process.env.HOST || 'localhost',
    allowedHosts: (process.env.ALLOWED_HOSTS || '')
      .split(',')
      .filter(Boolean)
      .concat(['blogtest.psannetwork.net', 'blog.psannetwork.net'])
  },
  preview: {
    port: parseInt(process.env.PREVIEW_PORT || '5892', 10),
    strictPort: process.env.STRICT_PORT === 'true',
    host: process.env.HOST || 'localhost',
    allowedHosts: (process.env.ALLOWED_HOSTS || '')
      .split(',')
      .filter(Boolean)
      .concat(['blogtest.psannetwork.net', 'blog.psannetwork.net'])
  }
});

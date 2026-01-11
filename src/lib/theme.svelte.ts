import { browser } from '$app/environment';

export const theme = $state({
	current: 'light',
	toggle() {
		this.current = this.current === 'light' ? 'dark' : 'light';
		if (browser) {
			localStorage.setItem('theme', this.current);
			this.apply();
		}
	},
	apply() {
		if (!browser) return;
		if (this.current === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	},
	init() {
		if (!browser) return;
		const saved = localStorage.getItem('theme');
		if (saved) {
			this.current = saved;
		} else {
			this.current = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
		this.apply();
	}
});

import { browser } from '$app/environment';

class ThemeState {
	current = $state('light');

	constructor() {
		if (browser) {
			const saved = localStorage.getItem('theme');
			if (saved) {
				this.current = saved;
			} else {
				this.current = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
			}
			this.apply();
		}
	}

	toggle() {
		this.current = this.current === 'light' ? 'dark' : 'light';
		localStorage.setItem('theme', this.current);
		this.apply();
	}

	apply() {
		if (!browser) return;
		if (this.current === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}

	init() {
		this.apply();
	}
}

export const theme = new ThemeState();
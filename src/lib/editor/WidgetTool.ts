export class WidgetTool {
	static get isReadOnlySupported() { return true; }
	
	public data: { name: string };

	constructor({ data }: { data: { name: string } }) {
		this.data = data;
	}

	render() {
		const div = document.createElement('div');
		div.classList.add('bg-slate-100', 'dark:bg-slate-800', 'p-4', 'rounded-2xl', 'text-center', 'border-2', 'border-dashed', 'border-slate-300', 'dark:border-slate-700');
		
		const name = this.data.name || 'unknown';
		div.innerHTML = `<span class="font-black text-xs uppercase tracking-widest text-slate-500">Widget: ${name}</span>`;
		
		return div;
	}

	save() {
		return this.data;
	}
}

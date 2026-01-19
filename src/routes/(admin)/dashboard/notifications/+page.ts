import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const res = await fetch('/api/notifications');
	const result = await res.json();
	return {
		notificationResult: result
	};
};

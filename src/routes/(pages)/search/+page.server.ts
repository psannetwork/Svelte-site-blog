import { getSettings } from '$lib/server/settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const settings = getSettings();
	return {
		settings: {
			enable_turnstile: settings.enable_turnstile,
			turnstile_site_key: settings.turnstile_site_key
		}
	};
};

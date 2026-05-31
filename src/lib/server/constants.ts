export const DEFAULT_SETTINGS: Record<string, string> = {
	site_title: 'PSANBLOG',
	site_description: '',
	is_site_public: 'true',
	allow_signup: 'true',
	allow_comments: 'true',
	allow_anonymous_comments: 'false',
	anonymous_name: 'Anonymous',
	allow_account_deletion: 'true',
	show_footer_auth: 'true',
	require_email_verification: 'false',
	enable_turnstile: 'false',
	turnstile_site_key: '',
	turnstile_secret_key: '',
	accent_color: '#00CC99',
	font_family: "'Inter', 'Noto Sans JP', sans-serif",
	border_radius: '32px',
	bg_secondary_light: '#f1f5f9',
	bg_secondary_dark: '#1e293b',
	card_bg_light: '#ffffff',
	card_bg_dark: '#1e293b',
	enable_backup: 'false',
	backup_interval: '24',
	backup_keep_count: '5',
	last_backup_at: '0',
	is_setup_completed: 'false',
	allowed_extensions: '["jpg","jpeg","png","gif","webp","svg","ico"]',
	storage_type: 'local',
	site_language: 'ja',
	home_hero_content: JSON.stringify({
		blocks: [{ type: 'header', data: { text: 'CREATE BETTER CONTENT.', level: 1 } }]
	}),
	about_page_content: JSON.stringify({ blocks: [] }),
	error_404_content: JSON.stringify({
		blocks: [{ type: 'header', data: { text: '404 Not Found', level: 2 } }]
	}),
	error_500_content: JSON.stringify({
		blocks: [{ type: 'header', data: { text: '500 Server Error', level: 2 } }]
	}),
	custom_css: '',
	monthly_goal_hits: '1000',
	header_menu: JSON.stringify([
		{ label: 'HOME', url: '/' },
		{ label: 'ABOUT', url: '/about' }
	]),
	footer_menu: JSON.stringify([
		{ label: 'HOME', url: '/' },
		{ label: 'ABOUT', url: '/about' },
		{ label: 'PRIVACY', url: '/privacy' }
	])
};

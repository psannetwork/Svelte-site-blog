import { getSetting } from './settings';

export async function sendVerificationEmail(email: string, token: string) {
	const siteTitle = getSetting('site_title', 'PSANBLOG');
	const baseUrl = 'http://localhost:5173';

	// console.log(`[EMAIL API MOCK] To: ${email}`);
	// console.log(`[EMAIL API MOCK] Subject: ${siteTitle} - メールアドレスの確認`);
	// console.log(`[EMAIL API MOCK] Link: ${baseUrl}/auth/verify-email?token=${token}`);
	return true;
}

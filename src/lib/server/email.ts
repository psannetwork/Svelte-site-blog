import { getSetting } from "./settings";

export async function sendVerificationEmail(email: string, token: string) {
	const siteTitle = getSetting("site_title", "PSANBLOG");
	const baseUrl = "http://blogtest.psannetwork.net"; // 本番環境では環境変数から取得推奨

	console.log(`[EMAIL API MOCK] To: ${email}`);
	console.log(`[EMAIL API MOCK] Subject: ${siteTitle} - メールアドレスの確認`);
	console.log(`[EMAIL API MOCK] Link: ${baseUrl}/auth/verify-email?token=${token}`);
	
	// ここに将来的に実際のメール送信API（Nodemailerや外部サービス）を記述します
	return true;
}

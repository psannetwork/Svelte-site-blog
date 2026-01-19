import { Lucia } from 'lucia';
import { BetterSqlite3Adapter } from '@lucia-auth/adapter-sqlite';
import db from './db';
import { dev } from '$app/environment';

const adapter = new BetterSqlite3Adapter(db, {
	user: 'user',
	session: 'session'
});

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			secure: !dev
		}
	},
	getUserAttributes: (attributes) => {
		return {
			username: attributes.username,
			nickname: attributes.nickname,
			avatar_url: attributes.avatar_url,
			role: attributes.role,
			is_protected: attributes.is_protected,
			notification_enabled: attributes.notification_enabled
		};
	}
});

declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
	username: string;
	nickname: string;
	avatar_url: string | null;
	role: string;
	is_protected: number;
	notification_enabled: number;
}

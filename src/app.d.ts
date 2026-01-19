import type { Session, User } from 'lucia';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			session: Session | null;
		}
		interface PageData {
			pageTitle?: string;
		}
	}
}

export {};

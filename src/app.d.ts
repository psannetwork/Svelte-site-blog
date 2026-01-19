import type { Session, User } from 'lucia';

declare global {
	interface Window {
		turnstile: {
			render: (element: string | HTMLElement, options: any) => string;
			reset: (widgetId: string) => void;
			remove: (widgetId: string | HTMLElement) => void;
			getResponse: (widgetId: string) => string;
		};
	}
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

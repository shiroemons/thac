import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const getBaseURL = () => {
	if (typeof window !== "undefined") {
		return window.location.origin; // ブラウザ: 自分自身
	}
	return import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
};

export const authClient = createAuthClient({
	baseURL: getBaseURL(),
	plugins: [
		adminClient(),
		inferAdditionalFields({
			user: {
				onboardingCompleted: {
					type: "boolean",
				},
			},
		}),
	],
	fetchOptions: {
		credentials: "include",
	},
});

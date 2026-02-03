import type { auth } from "@thac/auth";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// TanStack Startでは、SSR時も import.meta.env.VITE_* が利用可能
// クライアント/サーバー両方で同じURLを使用
// フォールバック値を追加して undefined を防止
const getBaseURL = () => {
	return import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
};

export const authClient = createAuthClient({
	baseURL: getBaseURL(),
	plugins: [adminClient(), inferAdditionalFields<typeof auth>()],
	fetchOptions: {
		credentials: "include",
	},
});

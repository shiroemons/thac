import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// SSR時はSERVER_URL（Docker内部通信用）、クライアント側はVITE_SERVER_URL（ブラウザ用）を使用
const getBaseURL = () => {
	if (typeof window === "undefined") {
		// サーバーサイド（SSR）
		return process.env.SERVER_URL || import.meta.env.VITE_SERVER_URL;
	}
	// クライアントサイド
	return import.meta.env.VITE_SERVER_URL;
};

export const authClient = createAuthClient({
	baseURL: getBaseURL(),
	plugins: [adminClient()],
});

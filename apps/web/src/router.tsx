import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { GlobalErrorComponent } from "./components/error-boundary";
import { GlobalNotFound } from "./components/global-not-found";
import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";

/**
 * QueryClientファクトリ
 * SSR時は毎回新しいインスタンス、ブラウザ時はシングルトン
 */
function makeQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
			},
		},
	});
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
	if (typeof window === "undefined") {
		// Server: 常に新しいQueryClientを作成
		return makeQueryClient();
	}
	// Browser: シングルトンを使用
	if (!browserQueryClient) {
		browserQueryClient = makeQueryClient();
	}
	return browserQueryClient;
}

export const getRouter = () => {
	const queryClient = getQueryClient();

	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent", // ホバー・タッチ時にプリフェッチ
		defaultPreloadStaleTime: 30_000, // 30秒間はキャッシュを使用
		defaultPendingMs: 1000, // loader完了が1秒以内ならpendingComponentを出さない
		defaultPendingMinMs: 500, // pendingComponentを出した場合は最低500ms表示してちらつき防止
		context: {
			queryClient,
		},
		defaultPendingComponent: () => <Loader />,
		defaultNotFoundComponent: GlobalNotFound,
		defaultErrorComponent: GlobalErrorComponent,
		Wrap: ({ children }) => <>{children}</>,
	});
	return router;
};

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}

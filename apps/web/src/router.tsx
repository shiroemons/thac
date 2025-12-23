import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { GlobalErrorComponent } from "./components/error-boundary";
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
		defaultPreloadStaleTime: 0,
		context: {
			queryClient,
		},
		defaultPendingComponent: () => <Loader />,
		defaultNotFoundComponent: () => <div>Not Found</div>,
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

import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
	useLocation,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { APP_NAME } from "@/lib/head";
import { ThemeProvider } from "@/lib/theme";
import Header from "../components/header";
import appCss from "../index.css?url";

/**
 * ルーターコンテキストの型定義
 * queryClientはrouter.tsxで注入される
 */
export type RouterAppContext = {
	queryClient: QueryClient;
};

// Inline script to prevent FOUC (Flash of Unstyled Content)
const themeInitScript = `
(function() {
  var theme = localStorage.getItem('theme') || 'system';
  var resolvedTheme = theme;
  if (theme === 'system') {
    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', resolvedTheme);
  // Pass initial values to React for hydration sync
  window.__THEME_DATA__ = { theme: theme, resolvedTheme: resolvedTheme };
})();
`;

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: APP_NAME,
			},
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),

	component: RootDocument,
});

// 公開ページのパス一覧（_publicレイアウトで独自のヘッダーを使用）
const PUBLIC_PATHS = [
	"/",
	"/about",
	"/search",
	"/original-songs",
	"/official-works",
	"/circles",
	"/artists",
	"/events",
	"/roles",
	"/stats",
];

function isPublicRoute(pathname: string): boolean {
	return PUBLIC_PATHS.some(
		(path) => pathname === path || pathname.startsWith(`${path}/`),
	);
}

function RootDocument() {
	const location = useLocation();
	const isAdminRoute = location.pathname.startsWith("/admin");
	const isPublic = isPublicRoute(location.pathname);
	// ルーターコンテキストからqueryClientを取得
	const { queryClient } = Route.useRouteContext();

	// 公開ページと管理ページは独自のレイアウトを持つ
	const showDefaultHeader = !isAdminRoute && !isPublic;

	return (
		<html lang="ja" suppressHydrationWarning>
			<head suppressHydrationWarning>
				<HeadContent />
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for SSR theme initialization to prevent FOUC
					dangerouslySetInnerHTML={{ __html: themeInitScript }}
				/>
			</head>
			<body>
				<QueryClientProvider client={queryClient}>
					<ThemeProvider>
						<div
							className={
								showDefaultHeader ? "grid h-svh grid-rows-[auto_1fr]" : ""
							}
						>
							{showDefaultHeader && <Header />}
							<Outlet />
						</div>
					</ThemeProvider>
				</QueryClientProvider>
				<TanStackRouterDevtools position="bottom-left" />
				<Scripts />
			</body>
		</html>
	);
}

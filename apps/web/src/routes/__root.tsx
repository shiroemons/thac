import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
	useLocation,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/theme";
import Header from "../components/header";
import appCss from "../index.css?url";

export type RouterAppContext = Record<string, never>;

// Inline script to prevent FOUC (Flash of Unstyled Content)
const themeInitScript = `
(function() {
  var theme = localStorage.getItem('theme') || 'system';
  var resolvedTheme = theme;
  if (theme === 'system') {
    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', resolvedTheme);
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
				title: "My App",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	component: RootDocument,
});

function RootDocument() {
	const location = useLocation();
	const isAdminRoute = location.pathname.startsWith("/admin");

	return (
		<html lang="ja">
			<head>
				<HeadContent />
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for SSR theme initialization to prevent FOUC
					dangerouslySetInnerHTML={{ __html: themeInitScript }}
				/>
			</head>
			<body>
				<ThemeProvider>
					<div className="grid h-svh grid-rows-[auto_1fr]">
						{!isAdminRoute && <Header />}
						<Outlet />
					</div>
					<Toaster richColors />
				</ThemeProvider>
				<TanStackRouterDevtools position="bottom-left" />
				<Scripts />
			</body>
		</html>
	);
}

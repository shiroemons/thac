import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
	PublicFooter,
	PublicHeader,
	PublicNotFound,
} from "@/components/public";
import { PublicErrorBoundary } from "@/components/public-error-boundary";
import { ExternalLinkProvider } from "@/contexts/external-link-context";

export const Route = createFileRoute("/_public")({
	component: PublicLayout,
	errorComponent: PublicErrorBoundary,
	notFoundComponent: PublicNotFound,
});

function PublicLayout() {
	return (
		<ExternalLinkProvider>
			<div className="flex min-h-screen flex-col">
				<PublicHeader />
				<main className="container mx-auto flex-1 px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
					<Outlet />
				</main>
				<PublicFooter />
			</div>
		</ExternalLinkProvider>
	);
}

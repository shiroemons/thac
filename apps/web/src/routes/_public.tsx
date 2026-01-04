import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { ExternalLinkProvider } from "@/contexts/external-link-context";

export const Route = createFileRoute("/_public")({
	component: PublicLayout,
});

function PublicLayout() {
	return (
		<ExternalLinkProvider>
			<div className="flex min-h-screen flex-col">
				<PublicHeader />
				<main className="container mx-auto flex-1 px-4 py-6">
					<Outlet />
				</main>
				<PublicFooter />
			</div>
		</ExternalLinkProvider>
	);
}

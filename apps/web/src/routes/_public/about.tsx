import { createFileRoute } from "@tanstack/react-router";
import { PublicBreadcrumb } from "@/components/public/public-breadcrumb";

export const Route = createFileRoute("/_public/about")({
	component: AboutPage,
});

function AboutPage() {
	return (
		<div>
			<PublicBreadcrumb items={[{ label: "About" }]} />
			<h1 className="font-bold text-3xl">About</h1>
			<p className="mt-2 text-base-content/70">Phase 7で実装予定</p>
		</div>
	);
}

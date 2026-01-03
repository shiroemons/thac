import { createFileRoute } from "@tanstack/react-router";
import { PublicBreadcrumb } from "@/components/public/public-breadcrumb";

export const Route = createFileRoute("/_public/artists")({
	component: ArtistsPage,
});

function ArtistsPage() {
	return (
		<div>
			<PublicBreadcrumb items={[{ label: "アーティスト" }]} />
			<h1 className="font-bold text-3xl">アーティスト一覧</h1>
			<p className="mt-2 text-base-content/70">Phase 6で実装予定</p>
		</div>
	);
}

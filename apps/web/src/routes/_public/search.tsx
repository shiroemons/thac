import { createFileRoute } from "@tanstack/react-router";
import { PublicBreadcrumb } from "@/components/public/public-breadcrumb";

export const Route = createFileRoute("/_public/search")({
	component: SearchPage,
});

function SearchPage() {
	return (
		<div>
			<PublicBreadcrumb items={[{ label: "検索" }]} />
			<h1 className="font-bold text-3xl">検索</h1>
			<p className="mt-2 text-base-content/70">Phase 7で実装予定</p>
		</div>
	);
}

import { createFileRoute } from "@tanstack/react-router";
import { PublicBreadcrumb } from "@/components/public/public-breadcrumb";

export const Route = createFileRoute("/_public/circles")({
	component: CirclesPage,
});

function CirclesPage() {
	return (
		<div>
			<PublicBreadcrumb items={[{ label: "サークル" }]} />
			<h1 className="font-bold text-3xl">サークル一覧</h1>
			<p className="mt-2 text-base-content/70">Phase 5で実装予定</p>
		</div>
	);
}

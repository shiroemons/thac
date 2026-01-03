import { createFileRoute } from "@tanstack/react-router";
import { PublicBreadcrumb } from "@/components/public/public-breadcrumb";

export const Route = createFileRoute("/_public/events")({
	component: EventsPage,
});

function EventsPage() {
	return (
		<div>
			<PublicBreadcrumb items={[{ label: "イベント" }]} />
			<h1 className="font-bold text-3xl">イベント一覧</h1>
			<p className="mt-2 text-base-content/70">Phase 5で実装予定</p>
		</div>
	);
}

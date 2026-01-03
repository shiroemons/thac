import { createFileRoute } from "@tanstack/react-router";
import { PublicBreadcrumb } from "@/components/public/public-breadcrumb";

export const Route = createFileRoute("/_public/original-songs")({
	component: OriginalSongsPage,
});

function OriginalSongsPage() {
	return (
		<div>
			<PublicBreadcrumb items={[{ label: "原曲" }]} />
			<h1 className="font-bold text-3xl">原曲一覧</h1>
			<p className="mt-2 text-base-content/70">Phase 4で実装予定</p>
		</div>
	);
}

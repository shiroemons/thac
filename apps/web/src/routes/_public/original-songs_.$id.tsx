import { createFileRoute } from "@tanstack/react-router";
import { PublicBreadcrumb } from "@/components/public";

export const Route = createFileRoute("/_public/original-songs_/$id")({
	component: OriginalSongDetailPage,
});

function OriginalSongDetailPage() {
	const { id } = Route.useParams();

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[{ label: "原曲", href: "/original-songs" }, { label: id }]}
			/>
			<h1 className="font-bold text-3xl">原曲詳細</h1>
			<p className="text-base-content/70">ID: {id}</p>
			<p className="text-base-content/70">詳細ページは後のフェーズで実装予定</p>
		</div>
	);
}

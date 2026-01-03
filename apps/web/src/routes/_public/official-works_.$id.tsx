import { createFileRoute } from "@tanstack/react-router";
import { PublicBreadcrumb } from "@/components/public";

export const Route = createFileRoute("/_public/official-works_/$id")({
	component: OfficialWorkDetailPage,
});

function OfficialWorkDetailPage() {
	const { id } = Route.useParams();

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[{ label: "公式作品", href: "/official-works" }, { label: id }]}
			/>
			<h1 className="font-bold text-3xl">公式作品詳細</h1>
			<p className="text-base-content/70">ID: {id}</p>
			<p className="text-base-content/70">詳細ページは後のフェーズで実装予定</p>
		</div>
	);
}

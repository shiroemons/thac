import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicBreadcrumb } from "@/components/public";

export const Route = createFileRoute("/_public/circles_/$id")({
	component: CircleDetailPage,
});

function CircleDetailPage() {
	const { id } = Route.useParams();

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[{ label: "サークル", href: "/circles" }, { label: id }]}
			/>

			<div className="rounded-lg bg-base-100 p-6 shadow-sm">
				<h1 className="font-bold text-3xl">サークル詳細</h1>
				<p className="mt-2 text-base-content/70">
					サークルID:{" "}
					<code className="rounded bg-base-200 px-2 py-1">{id}</code>
				</p>
				<p className="mt-4 text-base-content/50">
					詳細ページは後のフェーズで実装予定です。
				</p>
				<div className="mt-6">
					<Link to="/circles" className="btn btn-ghost btn-sm">
						← サークル一覧に戻る
					</Link>
				</div>
			</div>
		</div>
	);
}

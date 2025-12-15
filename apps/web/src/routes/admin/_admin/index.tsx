import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/_admin/")({
	component: AdminDashboard,
});

function AdminDashboard() {
	return (
		<div className="p-8">
			<div className="mx-auto max-w-4xl">
				<div className="card bg-base-100 shadow-lg">
					<div className="card-body">
						<h1 className="card-title text-2xl">管理者ダッシュボード</h1>
						<p className="text-base-content/70">
							管理者ダッシュボードの内容はここに表示されます。
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/_admin/")({
	component: AdminDashboard,
});

function AdminDashboard() {
	return (
		<div className="min-h-screen bg-slate-50 p-8">
			<div className="mx-auto max-w-4xl">
				<div className="rounded-lg bg-white p-6 shadow-lg">
					<h1 className="font-bold text-2xl text-slate-900">
						管理者ダッシュボード
					</h1>
					<div className="mt-4">
						<p className="text-slate-600">
							管理者ダッシュボードの内容はここに表示されます。
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

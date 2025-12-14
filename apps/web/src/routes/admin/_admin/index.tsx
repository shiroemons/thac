import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/admin/_admin/")({
	component: AdminDashboard,
});

function AdminDashboard() {
	const navigate = useNavigate();
	const { user } = Route.useRouteContext();

	const handleLogout = async () => {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					toast.success("ログアウトしました");
					navigate({
						to: "/admin/login",
					});
				},
			},
		});
	};

	return (
		<div className="min-h-screen bg-slate-50 p-8">
			<div className="mx-auto max-w-4xl">
				<div className="rounded-lg bg-white p-6 shadow-lg">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="font-bold text-2xl text-slate-900">
								管理者ダッシュボード
							</h1>
							<p className="mt-1 text-slate-600">
								ようこそ、{user?.name || user?.email} さん
							</p>
						</div>
						<Button variant="outline" onClick={handleLogout}>
							ログアウト
						</Button>
					</div>

					<div className="mt-8">
						<p className="text-slate-600">
							管理者ダッシュボードの内容はここに表示されます。
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

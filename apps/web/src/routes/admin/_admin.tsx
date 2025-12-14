import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import ForbiddenPage from "@/components/forbidden-page";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/admin/_admin")({
	beforeLoad: async () => {
		// セッション確認
		const session = await authClient.getSession();

		// 未認証ユーザーは/admin/loginにリダイレクト
		if (!session.data?.user) {
			throw redirect({
				to: "/admin/login",
			});
		}

		// 管理者ロール検証
		if (session.data.user.role !== "admin") {
			// 非管理者は403を表示（contextにフラグを設定）
			return {
				user: session.data.user,
				isForbidden: true,
			};
		}

		// 認証済み管理者の情報を子ルートにcontextで伝播
		return {
			user: session.data.user,
			isForbidden: false,
		};
	},
	component: AdminLayout,
});

function AdminLayout() {
	const { isForbidden } = Route.useRouteContext();

	if (isForbidden) {
		return <ForbiddenPage />;
	}

	return <Outlet />;
}

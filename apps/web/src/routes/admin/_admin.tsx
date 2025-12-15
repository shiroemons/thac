import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin-layout";
import ForbiddenPage from "@/components/forbidden-page";
import { getAdminUser } from "@/functions/get-admin-user";

export const Route = createFileRoute("/admin/_admin")({
	beforeLoad: async () => {
		try {
			// サーバー関数経由でセッション確認（Cookie転送を含む）
			const session = await getAdminUser();

			// 未認証ユーザーは/admin/loginにリダイレクト
			if (!session?.user) {
				throw redirect({
					to: "/admin/login",
				});
			}

			// 管理者ロール検証
			if (session.user.role !== "admin") {
				// 非管理者は403を表示（contextにフラグを設定）
				return {
					user: session.user,
					isForbidden: true,
				};
			}

			// 認証済み管理者の情報を子ルートにcontextで伝播
			return {
				user: session.user,
				isForbidden: false,
			};
		} catch (error) {
			// セッション取得失敗時はログインページへリダイレクト
			if (error instanceof Error && "to" in error) {
				// redirect例外はそのままスロー
				throw error;
			}
			// ネットワークエラーやサーバーエラー時
			throw redirect({
				to: "/admin/login",
			});
		}
	},
	component: AdminLayoutWrapper,
});

function AdminLayoutWrapper() {
	const { user, isForbidden } = Route.useRouteContext();

	if (isForbidden) {
		return <ForbiddenPage />;
	}

	return <AdminLayout user={user} />;
}

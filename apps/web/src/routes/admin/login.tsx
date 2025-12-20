import { createFileRoute } from "@tanstack/react-router";
import AdminLoginForm from "@/components/admin-login-form";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/admin/login")({
	head: () => createPageHead("管理者ログイン"),
	component: AdminLoginPage,
});

function AdminLoginPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-base-200">
			<div className="card w-full max-w-md bg-base-100 shadow-lg">
				<div className="card-body">
					<AdminLoginForm />
				</div>
			</div>
		</div>
	);
}

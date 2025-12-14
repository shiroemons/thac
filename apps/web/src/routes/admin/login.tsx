import { createFileRoute } from "@tanstack/react-router";
import AdminLoginForm from "@/components/admin-login-form";

export const Route = createFileRoute("/admin/login")({
	component: AdminLoginPage,
});

function AdminLoginPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-slate-50">
			<div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
				<AdminLoginForm />
			</div>
		</div>
	);
}

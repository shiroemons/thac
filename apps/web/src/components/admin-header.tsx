import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

interface AdminHeaderProps {
	user: {
		id: string;
		name: string | null;
		email: string;
		role: string;
	} | null;
}

const navLinks = [{ to: "/admin", label: "ダッシュボード" }] as const;

export default function AdminHeader({ user }: AdminHeaderProps) {
	const navigate = useNavigate();

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
		<div className="bg-slate-800">
			<div className="flex flex-row items-center justify-between px-4 py-2">
				<div className="flex items-center gap-6">
					<span className="font-bold text-lg text-white">管理者</span>
					<nav className="flex gap-4">
						{navLinks.map(({ to, label }) => (
							<Link
								key={to}
								to={to}
								className="text-slate-300 hover:text-white [&.active]:font-semibold [&.active]:text-white"
							>
								{label}
							</Link>
						))}
					</nav>
				</div>
				<div className="flex items-center gap-4">
					<span className="text-slate-300">{user?.name || user?.email}</span>
					<Button variant="outline" size="sm" onClick={handleLogout}>
						ログアウト
					</Button>
				</div>
			</div>
		</div>
	);
}

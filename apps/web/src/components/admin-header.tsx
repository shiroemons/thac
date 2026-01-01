import { Link, useNavigate } from "@tanstack/react-router";
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

const navLinks = [
	{ to: "/admin", label: "ダッシュボード" },
	{ to: "/admin/master/platforms", label: "プラットフォーム" },
	{ to: "/admin/master/alias-types", label: "名義種別" },
	{ to: "/admin/master/credit-roles", label: "クレジット役割" },
	{ to: "/admin/master/official-work-categories", label: "公式作品カテゴリ" },
] as const;

export default function AdminHeader({ user }: AdminHeaderProps) {
	const navigate = useNavigate();

	const handleLogout = async () => {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					navigate({
						to: "/admin/login",
					});
					// 成功通知は不要（リダイレクトで自明）
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

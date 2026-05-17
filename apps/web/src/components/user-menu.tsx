import { Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { Skeleton } from "./ui/skeleton";

export default function UserMenu() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <Skeleton className="h-10 w-10 rounded-full" />;
	}

	if (!session) {
		return (
			<Link to="/login" className="btn btn-outline btn-sm">
				ログイン
			</Link>
		);
	}

	const handleSignOut = () => {
		authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					navigate({
						to: "/",
					});
				},
			},
		});
	};

	const avatarUrl =
		session.user.image ||
		`https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.name || "User")}&background=random`;

	return (
		<div className="dropdown dropdown-end">
			<div
				tabIndex={0}
				role="button"
				className="btn btn-ghost btn-circle avatar"
			>
				<div className="w-10 rounded-full">
					<img src={avatarUrl} alt={session.user.name || "ユーザー"} />
				</div>
			</div>
			<ul
				role="menu"
				className="dropdown-content menu z-50 w-52 rounded-box bg-base-100 p-2 shadow-lg"
			>
				<li className="menu-title">{session.user.name}</li>
				<li className="px-4 pb-2 text-base-content/60 text-xs">
					{session.user.email}
				</li>
				<div className="divider my-0" />
				<li>
					<Link to="/user/profile">プロフィール</Link>
				</li>
				<li>
					<Link to="/user/settings">設定</Link>
				</li>
				<li>
					<Link to="/user/album-requests">アルバム情報の提供</Link>
				</li>
				<li>
					<Link to="/user/collections">コレクション</Link>
				</li>
				<li>
					<Link to="/user/likes">お気に入り</Link>
				</li>
				<div className="divider my-0" />
				<li>
					<button type="button" onClick={handleSignOut} className="text-error">
						ログアウト
					</button>
				</li>
			</ul>
		</div>
	);
}

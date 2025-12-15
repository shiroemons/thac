import { Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { Skeleton } from "./ui/skeleton";

export default function UserMenu() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <Skeleton className="h-9 w-24" />;
	}

	if (!session) {
		return (
			<Link to="/login" className="btn btn-outline btn-sm">
				Sign In
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

	return (
		<div className="dropdown dropdown-end">
			<div tabIndex={0} role="button" className="btn btn-ghost">
				{session.user.name}
			</div>
			<ul
				role="menu"
				className="dropdown-content menu z-50 w-52 rounded-box bg-base-100 p-2 shadow-lg"
			>
				<li className="menu-title">{session.user.email}</li>
				<li>
					<button type="button" onClick={handleSignOut} className="text-error">
						Sign Out
					</button>
				</li>
			</ul>
		</div>
	);
}

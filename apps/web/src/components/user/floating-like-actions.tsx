import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { userLikesCheckQueryOptions } from "@/lib/user-collections-query-options";
import { AddToCollectionDropdown } from "./add-to-collection-dropdown";
import { LikeButton } from "./like-button";

interface FloatingLikeActionsProps {
	targetType: "track" | "release" | "circle";
	targetId: string;
}

export function FloatingLikeActions({
	targetType,
	targetId,
}: FloatingLikeActionsProps) {
	const { data: session } = authClient.useSession();
	const navigate = useNavigate();
	const location = useLocation();
	const currentPath = location.pathname;

	const checkQuery = useQuery({
		...userLikesCheckQueryOptions([{ targetType, targetId }]),
		enabled: !!session?.user,
	});

	const isLiked = checkQuery.data?.results[0]?.liked ?? false;

	if (!session?.user) {
		return null;
	}

	return (
		<div className="flex items-center gap-2">
			<LikeButton
				targetType={targetType}
				targetId={targetId}
				isLiked={isLiked}
				size="md"
				currentPath={currentPath}
			/>
			<AddToCollectionDropdown
				targetType={targetType}
				targetId={targetId}
				currentPath={currentPath}
				dropUp
				onNavigateToNew={() => navigate({ to: "/user/collections/new" })}
			/>
		</div>
	);
}

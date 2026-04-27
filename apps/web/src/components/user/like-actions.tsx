import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { userLikesCheckQueryOptions } from "@/lib/user-collections-query-options";
import { AddToCollectionDropdown } from "./add-to-collection-dropdown";
import { LikeButton } from "./like-button";

interface LikeActionsProps {
	targetType: "track" | "release" | "circle";
	targetId: string;
	size?: "sm" | "md" | "lg";
}

export function LikeActions({
	targetType,
	targetId,
	size = "md",
}: LikeActionsProps) {
	const { data: session } = authClient.useSession();
	const navigate = useNavigate();
	const location = useLocation();
	const currentPath = location.pathname;

	const checkQuery = useQuery({
		...userLikesCheckQueryOptions([{ targetType, targetId }]),
		enabled: !!session?.user,
	});

	const isLiked = checkQuery.data?.results[0]?.liked ?? false;

	return (
		<div className="flex items-center gap-2">
			<LikeButton
				targetType={targetType}
				targetId={targetId}
				isLiked={isLiked}
				size={size}
				currentPath={currentPath}
			/>
			<AddToCollectionDropdown
				targetType={targetType}
				targetId={targetId}
				currentPath={currentPath}
				onNavigateToNew={() => navigate({ to: "/user/collections/new" })}
			/>
		</div>
	);
}

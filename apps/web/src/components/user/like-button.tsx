import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { userLikesMutations } from "@/lib/user-collections-query-options";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
	targetType: "track" | "release" | "circle";
	targetId: string;
	isLiked: boolean;
	size?: "sm" | "md" | "lg";
	currentPath?: string;
}

export function LikeButton({
	targetType,
	targetId,
	isLiked,
	size = "md",
	currentPath,
}: LikeButtonProps) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();

	const [optimisticLiked, setOptimisticLiked] = useState(isLiked);

	const addMutation = useMutation(userLikesMutations.add(queryClient));
	const removeMutation = useMutation(userLikesMutations.remove(queryClient));

	const handleClick = async () => {
		if (!session?.user) {
			navigate({
				to: "/login",
				search: { returnTo: currentPath ?? "/" },
			});
			return;
		}

		const willLike = !optimisticLiked;
		setOptimisticLiked(willLike);

		try {
			if (willLike) {
				await addMutation.mutateAsync({ targetType, targetId });
			} else {
				await removeMutation.mutateAsync({ targetType, targetId });
			}
		} catch {
			setOptimisticLiked(!willLike);
		}
	};

	const isPending = addMutation.isPending || removeMutation.isPending;

	const iconSizeClass = cn(
		size === "sm" && "size-4",
		size === "md" && "size-5",
		size === "lg" && "size-6",
	);

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={isPending}
			aria-pressed={optimisticLiked}
			aria-label={optimisticLiked ? "お気に入りから削除" : "お気に入りに追加"}
			className={cn(
				"btn btn-ghost gap-1",
				size === "sm" && "btn-sm",
				size === "lg" && "btn-lg",
				optimisticLiked && "text-error",
			)}
		>
			<Heart
				className={cn(iconSizeClass, optimisticLiked && "fill-current")}
				strokeWidth={optimisticLiked ? 1.5 : 2}
			/>
		</button>
	);
}

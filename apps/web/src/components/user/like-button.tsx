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

	// ミューテーション中のみ楽観的な値を保持する。null のときは isLiked prop を使用する
	const [pendingLiked, setPendingLiked] = useState<boolean | null>(null);

	const addMutation = useMutation(userLikesMutations.add(queryClient));
	const removeMutation = useMutation(userLikesMutations.remove(queryClient));

	const displayLiked = pendingLiked !== null ? pendingLiked : isLiked;

	const handleClick = async () => {
		if (!session?.user) {
			navigate({
				to: "/login",
				search: { returnTo: currentPath ?? "/" },
			});
			return;
		}

		const willLike = !displayLiked;
		setPendingLiked(willLike);

		try {
			if (willLike) {
				await addMutation.mutateAsync({ targetType, targetId });
			} else {
				await removeMutation.mutateAsync({ targetType, targetId });
			}
			// ミューテーション成功後は isLiked prop がキャッシュ更新で正しい値になるため
			// pendingLiked をクリアして prop に委譲する
			setPendingLiked(null);
		} catch {
			// エラー時は楽観更新を元に戻す
			setPendingLiked(null);
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
			aria-pressed={displayLiked}
			aria-label={displayLiked ? "お気に入りから削除" : "お気に入りに追加"}
			className={cn(
				"btn btn-ghost gap-1",
				size === "sm" && "btn-sm",
				size === "lg" && "btn-lg",
				displayLiked && "text-error",
			)}
		>
			<Heart
				className={cn(iconSizeClass, displayLiked && "fill-current")}
				strokeWidth={displayLiked ? 1.5 : 2}
			/>
		</button>
	);
}

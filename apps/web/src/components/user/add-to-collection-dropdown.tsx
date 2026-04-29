import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Check, Plus, Square } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import {
	userCollectionMutations,
	userCollectionsListQueryOptions,
} from "@/lib/user-collections-query-options";

interface AddToCollectionDropdownProps {
	targetType: "track" | "release" | "circle";
	targetId: string;
	currentPath?: string;
	/** ドロップダウンを上方向に展開する（FABとして使用する場合） */
	dropUp?: boolean;
	/** 「新規コレクションを作成」クリック時の処理。省略時はナビゲーションなし */
	onNavigateToNew?: () => void;
}

export function AddToCollectionDropdown({
	targetType,
	targetId,
	currentPath,
	dropUp = false,
	onNavigateToNew,
}: AddToCollectionDropdownProps) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const { showToast } = useToast();

	const collectionsQuery = useQuery({
		...userCollectionsListQueryOptions({
			kind: "collection",
			target: { type: targetType, id: targetId },
			excludeDefaultLiked: true,
		}),
		enabled: !!session?.user,
	});

	const addItemMutation = useMutation(
		userCollectionMutations.addItem(queryClient),
	);

	const removeItemMutation = useMutation(
		userCollectionMutations.removeItem(queryClient),
	);

	const handleToggle = async (
		collectionId: string,
		collectionName: string,
		containsTarget: boolean,
		containsItemId: string | null | undefined,
	) => {
		if (containsTarget && containsItemId) {
			try {
				await removeItemMutation.mutateAsync({
					id: collectionId,
					itemId: containsItemId,
				});
				showToast("success", `「${collectionName}」から削除しました`);
			} catch (e) {
				const message = e instanceof Error ? e.message : "削除に失敗しました";
				showToast("error", message);
			}
		} else {
			try {
				await addItemMutation.mutateAsync({
					id: collectionId,
					input: { targetType, targetId },
				});
				showToast("success", `「${collectionName}」に追加しました`);
			} catch (e) {
				const message = e instanceof Error ? e.message : "追加に失敗しました";
				showToast("error", message);
			}
		}
	};

	// 未ログインの場合はログインページへ誘導するボタンを表示
	if (!session?.user) {
		return (
			<button
				type="button"
				className="btn btn-ghost btn-sm gap-1"
				onClick={() =>
					navigate({ to: "/login", search: { returnTo: currentPath ?? "/" } })
				}
			>
				<Plus className="size-4" />
				コレクションに追加
			</button>
		);
	}

	const isPending = addItemMutation.isPending || removeItemMutation.isPending;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<button type="button" className="btn btn-ghost btn-sm gap-1">
					<Plus className="size-4" />
					コレクションに追加
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				side={dropUp ? "top" : "bottom"}
				className="w-64"
			>
				<DropdownMenuLabel>追加先を選択</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{collectionsQuery.isLoading ? (
					<DropdownMenuItem disabled>読み込み中...</DropdownMenuItem>
				) : collectionsQuery.data?.items.length === 0 ? (
					<DropdownMenuItem disabled>
						コレクションがまだありません
					</DropdownMenuItem>
				) : (
					collectionsQuery.data?.items.map((c) => (
						<DropdownMenuItem
							key={c.id}
							onClick={() =>
								handleToggle(
									c.id,
									c.name,
									c.containsTarget ?? false,
									c.containsItemId,
								)
							}
							disabled={isPending}
						>
							{c.containsTarget ? (
								<Check className="size-4 shrink-0 text-success" />
							) : (
								<Square className="size-4 shrink-0 text-base-content/30" />
							)}
							<span className="flex-1 truncate">{c.name}</span>
						</DropdownMenuItem>
					))
				)}
				<DropdownMenuSeparator />
				{onNavigateToNew && (
					<DropdownMenuItem onClick={onNavigateToNew}>
						<Plus className="size-4" />
						新規コレクションを作成
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

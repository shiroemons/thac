import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import {
	userCollectionMutations,
	userCollectionsListQueryOptions,
} from "@/lib/user-collections-query-options";

interface AddToCollectionDropdownProps {
	targetType: "track" | "release" | "circle";
	targetId: string;
	currentPath?: string;
	/** 「新規コレクションを作成」クリック時の処理。省略時はナビゲーションなし */
	onNavigateToNew?: () => void;
}

export function AddToCollectionDropdown({
	targetType,
	targetId,
	currentPath,
	onNavigateToNew,
}: AddToCollectionDropdownProps) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();

	const [feedback, setFeedback] = useState<{
		variant: "success" | "error";
		message: string;
	} | null>(null);

	const collectionsQuery = useQuery({
		...userCollectionsListQueryOptions({ kind: "collection" }),
		enabled: !!session?.user,
	});

	const addItemMutation = useMutation(
		userCollectionMutations.addItem(queryClient),
	);

	const handleAdd = async (collectionId: string, collectionName: string) => {
		try {
			await addItemMutation.mutateAsync({
				id: collectionId,
				input: { targetType, targetId },
			});
			setFeedback({
				variant: "success",
				message: `「${collectionName}」に追加しました`,
			});
		} catch (e) {
			const message = e instanceof Error ? e.message : "追加に失敗しました";
			setFeedback({ variant: "error", message });
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

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger>
					<button type="button" className="btn btn-ghost btn-sm gap-1">
						<Plus className="size-4" />
						コレクションに追加
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-64">
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
								onClick={() => handleAdd(c.id, c.name)}
								disabled={addItemMutation.isPending}
							>
								{c.name}
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
			{feedback && (
				<Banner
					variant={feedback.variant}
					autoHideDuration={2000}
					onAutoHide={() => setFeedback(null)}
					dismissible
					onDismiss={() => setFeedback(null)}
				>
					{feedback.message}
				</Banner>
			)}
		</>
	);
}

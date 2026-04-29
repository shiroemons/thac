import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Trash2 } from "lucide-react";
import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import { SortableCollectionItems } from "@/components/user/sortable-collection-items";
import type { UserCollectionItem } from "@/lib/api-client";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import { createPageHead } from "@/lib/head";
import {
	userCollectionDetailQueryOptions,
	userCollectionMutations,
	userCollectionsListQueryOptions,
} from "@/lib/user-collections-query-options";

export const Route = createFileRoute("/user/_user/likes")({
	head: () => createPageHead("お気に入り"),
	headers: () => CACHE_HEADERS.PRIVATE,
	loader: async ({ context }) => {
		const list = await context.queryClient.ensureQueryData(
			userCollectionsListQueryOptions({ kind: "collection" }),
		);
		const liked = list.items.find((c) => c.isDefaultLiked);
		if (liked) {
			await context.queryClient.ensureQueryData(
				userCollectionDetailQueryOptions(liked.id),
			);
			return { likedId: liked.id };
		}
		return { likedId: null };
	},
	component: LikesPage,
});

interface Feedback {
	variant: "success" | "error";
	message: string;
}

function LikesPage() {
	const { likedId } = Route.useLoaderData();

	if (!likedId) {
		return <LikesEmptyPage />;
	}

	return <LikesCollectionPage id={likedId} />;
}

interface LikesCollectionPageProps {
	id: string;
}

function LikesCollectionPage({ id }: LikesCollectionPageProps) {
	const queryClient = useQueryClient();
	const { data: collection } = useSuspenseQuery(
		userCollectionDetailQueryOptions(id),
	);

	const [feedback, setFeedback] = useState<Feedback | null>(null);

	const reorderMutation = useMutation(
		userCollectionMutations.reorderItems(queryClient),
	);
	const removeItemMutation = useMutation(
		userCollectionMutations.removeItem(queryClient),
	);
	const updateMutation = useMutation(
		userCollectionMutations.update(queryClient),
	);

	const handleReorder = async (newOrder: UserCollectionItem[]) => {
		try {
			await reorderMutation.mutateAsync({
				id,
				input: {
					items: newOrder.map((it, idx) => ({
						itemId: it.id,
						position: idx,
					})),
				},
			});
		} catch (e) {
			setFeedback({
				variant: "error",
				message: e instanceof Error ? e.message : "並び替えに失敗しました",
			});
		}
	};

	const handleToggleOrdered = async () => {
		try {
			await updateMutation.mutateAsync({
				id,
				input: { ordered: !collection.ordered },
			});
		} catch (e) {
			setFeedback({
				variant: "error",
				message: e instanceof Error ? e.message : "更新に失敗しました",
			});
		}
	};

	const handleRemoveItem = async (itemId: string) => {
		try {
			await removeItemMutation.mutateAsync({ id, itemId });
			setFeedback({ variant: "success", message: "アイテムを削除しました" });
		} catch (e) {
			setFeedback({
				variant: "error",
				message: e instanceof Error ? e.message : "削除に失敗しました",
			});
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-2xl">お気に入り</h1>
				<div className="mt-2 flex items-center gap-2 text-base-content/50 text-xs">
					<span>{collection.items.length} 件</span>
				</div>
			</div>

			{feedback && (
				<Banner
					variant={feedback.variant}
					autoHideDuration={3000}
					onAutoHide={() => setFeedback(null)}
					dismissible
					onDismiss={() => setFeedback(null)}
				>
					{feedback.message}
				</Banner>
			)}

			<div className="flex items-center gap-3">
				<input
					id="ordered-toggle"
					type="checkbox"
					className="toggle toggle-primary"
					checked={collection.ordered}
					onChange={handleToggleOrdered}
					disabled={updateMutation.isPending}
				/>
				<label htmlFor="ordered-toggle" className="cursor-pointer text-sm">
					並び替えモード（ドラッグで順序変更）
				</label>
			</div>

			{collection.items.length === 0 ? (
				<LikesEmptyPage />
			) : (
				<SortableCollectionItems
					key={collection.updatedAt}
					items={collection.items}
					disabled={!collection.ordered}
					onReorder={handleReorder}
					renderItem={(item) => (
						<LikesItemRow
							item={item}
							onRemove={() => handleRemoveItem(item.id)}
							removing={
								removeItemMutation.isPending &&
								removeItemMutation.variables?.itemId === item.id
							}
						/>
					)}
				/>
			)}
		</div>
	);
}

function LikesEmptyPage() {
	return (
		<div className="rounded-field bg-base-100 p-12 text-center shadow-sm">
			<Heart
				className="mx-auto mb-4 size-10 text-base-content/30"
				strokeWidth={1.5}
			/>
			<h1 className="font-bold text-xl">お気に入り</h1>
			<p className="mt-2 text-base-content/60">
				楽曲・アルバム・サークルの詳細ページにある♥ボタンを押すと、ここに自動で集まります。
			</p>
		</div>
	);
}

interface LikesItemRowProps {
	item: UserCollectionItem;
	onRemove: () => void;
	removing: boolean;
}

function LikesItemRow({ item, onRemove, removing }: LikesItemRowProps) {
	const { label, to } = (() => {
		switch (item.targetType) {
			case "track":
				return { label: "トラック", to: "/tracks/$id" };
			case "release":
				return { label: "アルバム", to: "/releases/$id" };
			case "circle":
				return { label: "サークル", to: "/circles/$id" };
		}
	})();

	const displayName =
		(item.target as { name?: string; title?: string } | null)?.name ??
		(item.target as { title?: string } | null)?.title ??
		"（削除されたアイテム）";

	return (
		<div className="flex items-center justify-between gap-4 rounded-field bg-base-100 p-3 shadow-sm">
			<div className="min-w-0 flex-1">
				<Link
					to={to}
					params={{ id: item.targetId }}
					className="font-medium hover:underline"
				>
					{displayName}
				</Link>
				<p className="text-base-content/50 text-xs">{label}</p>
				{item.note && (
					<p className="mt-1 text-base-content/60 text-sm">{item.note}</p>
				)}
			</div>
			<button
				type="button"
				onClick={onRemove}
				disabled={removing}
				className="btn btn-ghost btn-sm"
				aria-label="削除"
			>
				<Trash2 className="size-4" />
			</button>
		</div>
	);
}

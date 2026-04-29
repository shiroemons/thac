import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Settings, Trash2 } from "lucide-react";
import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import { CollectionUrlCopy } from "@/components/user/collection-url-copy";
import { SortableCollectionItems } from "@/components/user/sortable-collection-items";
import { VisibilityBadge } from "@/components/user/visibility-badge";
import type {
	UserCollectionDetail,
	UserCollectionItem,
	UserCollectionUpdateInput,
	UserCollectionVisibility,
} from "@/lib/api-client";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import { createPageHead } from "@/lib/head";
import {
	userCollectionDetailQueryOptions,
	userCollectionMutations,
} from "@/lib/user-collections-query-options";

export const Route = createFileRoute("/user/_user/collections_/$id")({
	head: () => createPageHead("コレクション詳細"),
	headers: () => CACHE_HEADERS.PRIVATE,
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			userCollectionDetailQueryOptions(params.id),
		);
	},
	component: CollectionDetailPage,
});

interface Feedback {
	variant: "success" | "error";
	message: string;
}

function CollectionDetailPage() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { data: collection } = useSuspenseQuery(
		userCollectionDetailQueryOptions(id),
	);

	const [feedback, setFeedback] = useState<Feedback | null>(null);
	const [isEditing, setIsEditing] = useState(false);

	const reorderMutation = useMutation(
		userCollectionMutations.reorderItems(queryClient),
	);
	const removeItemMutation = useMutation(
		userCollectionMutations.removeItem(queryClient),
	);
	const updateMutation = useMutation(
		userCollectionMutations.update(queryClient),
	);
	const deleteMutation = useMutation(
		userCollectionMutations.delete(queryClient),
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

	const handleDeleteCollection = async () => {
		try {
			await deleteMutation.mutateAsync(id);
			navigate({ to: "/user/collections" });
		} catch (e) {
			setFeedback({
				variant: "error",
				message:
					e instanceof Error ? e.message : "コレクションの削除に失敗しました",
			});
		}
	};

	const handleEditSubmit = async (input: UserCollectionUpdateInput) => {
		try {
			await updateMutation.mutateAsync({ id, input });
			setIsEditing(false);
			setFeedback({ variant: "success", message: "更新しました" });
		} catch (e) {
			setFeedback({
				variant: "error",
				message: e instanceof Error ? e.message : "更新に失敗しました",
			});
		}
	};

	return (
		<div className="space-y-6">
			<Link
				to="/user/collections"
				className="inline-flex items-center gap-1 text-base-content/60 text-sm hover:text-base-content"
			>
				<ArrowLeft className="size-4" />
				コレクション一覧へ
			</Link>

			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="font-bold text-2xl">{collection.name}</h1>
					{collection.description && (
						<p className="mt-2 text-base-content/60">
							{collection.description}
						</p>
					)}
					<div className="mt-2 flex items-center gap-2 text-base-content/50 text-xs">
						<span>{collection.items.length} 件</span>
						{collection.isDefaultLiked && (
							<span className="badge badge-error badge-sm">♥ Liked</span>
						)}
						{!collection.isDefaultLiked && (
							<VisibilityBadge visibility={collection.visibility} />
						)}
					</div>
					{!collection.isDefaultLiked &&
						(collection.visibility === "unlisted" ||
							collection.visibility === "public") &&
						collection.shortId && (
							<div className="mt-2">
								<CollectionUrlCopy shortId={collection.shortId} />
							</div>
						)}
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="btn btn-ghost btn-sm"
					>
						<Settings className="size-4" />
						編集
					</button>
					{!collection.isDefaultLiked && (
						<button
							type="button"
							onClick={handleDeleteCollection}
							disabled={deleteMutation.isPending}
							className="btn btn-error btn-outline btn-sm"
						>
							削除
						</button>
					)}
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
				<div className="rounded-field bg-base-100 p-12 text-center shadow-sm">
					<p className="text-base-content/60">
						アイテムがまだありません。楽曲・アルバム・サークルの詳細ページから追加してください。
					</p>
				</div>
			) : (
				<SortableCollectionItems
					key={collection.updatedAt}
					items={collection.items}
					disabled={!collection.ordered}
					onReorder={handleReorder}
					renderItem={(item) => (
						<CollectionItemRow
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

			{isEditing && (
				<EditCollectionDialog
					collection={collection}
					onClose={() => setIsEditing(false)}
					onSubmit={handleEditSubmit}
				/>
			)}
		</div>
	);
}

interface CollectionItemRowProps {
	item: UserCollectionItem;
	onRemove: () => void;
	removing: boolean;
}

function CollectionItemRow({
	item,
	onRemove,
	removing,
}: CollectionItemRowProps) {
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

interface EditCollectionDialogProps {
	collection: UserCollectionDetail;
	onClose: () => void;
	onSubmit: (input: UserCollectionUpdateInput) => Promise<void>;
}

function EditCollectionDialog({
	collection,
	onClose,
	onSubmit,
}: EditCollectionDialogProps) {
	const [name, setName] = useState(collection.name);
	const [description, setDescription] = useState(collection.description ?? "");
	const [visibility, setVisibility] = useState<UserCollectionVisibility>(
		collection.visibility,
	);
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			await onSubmit({
				name: name.trim(),
				description: description.trim() === "" ? null : description.trim(),
				visibility,
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="modal modal-open">
			<div className="modal-box">
				<h3 className="font-bold text-lg">コレクションを編集</h3>
				<form onSubmit={handleSubmit} className="mt-4 space-y-4">
					<div>
						<label className="label" htmlFor="edit-name">
							<span className="label-text">名前</span>
						</label>
						<input
							id="edit-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="input input-bordered w-full"
							maxLength={100}
							required
							autoComplete="off"
							data-1p-ignore
							data-lpignore="true"
							data-form-type="other"
							disabled={submitting}
						/>
					</div>
					<div>
						<label className="label" htmlFor="edit-description">
							<span className="label-text">説明（任意）</span>
						</label>
						<textarea
							id="edit-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className="textarea textarea-bordered w-full"
							maxLength={500}
							rows={3}
							disabled={submitting}
						/>
					</div>
					{!collection.isDefaultLiked && (
						<div>
							<label className="label" htmlFor="edit-visibility">
								<span className="label-text">公開範囲</span>
							</label>
							<select
								id="edit-visibility"
								value={visibility}
								onChange={(e) =>
									setVisibility(e.target.value as UserCollectionVisibility)
								}
								className="select select-bordered w-full"
								disabled={submitting}
							>
								<option value="private">非公開</option>
								<option value="unlisted">URLを知っている人のみ</option>
								<option value="public">公開</option>
							</select>
						</div>
					)}
					<div className="modal-action">
						<button
							type="button"
							onClick={onClose}
							className="btn btn-ghost"
							disabled={submitting}
						>
							キャンセル
						</button>
						<button
							type="submit"
							className="btn btn-primary"
							disabled={submitting}
						>
							{submitting ? "保存中..." : "保存"}
						</button>
					</div>
				</form>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="modal-backdrop"
				aria-label="閉じる"
			/>
		</div>
	);
}

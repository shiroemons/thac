import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Disc3, Music, UserRound, Users } from "lucide-react";
import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import type { CollectionItemType } from "@/lib/api-client";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import { createPageHead } from "@/lib/head";
import { userCollectionMutations } from "@/lib/user-collections-query-options";

export const Route = createFileRoute("/user/_user/collections_/new")({
	head: () => createPageHead("新規コレクション"),
	headers: () => CACHE_HEADERS.PRIVATE,
	component: CollectionNewPage,
});

const ITEM_TYPE_OPTIONS: {
	value: CollectionItemType;
	label: string;
	icon: React.ReactNode;
}[] = [
	{ value: "track", label: "楽曲", icon: <Music className="size-4" /> },
	{ value: "release", label: "アルバム", icon: <Disc3 className="size-4" /> },
	{ value: "circle", label: "サークル", icon: <Users className="size-4" /> },
	{
		value: "artist",
		label: "アーティスト",
		icon: <UserRound className="size-4" />,
	},
];

function CollectionNewPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const createMutation = useMutation(
		userCollectionMutations.create(queryClient),
	);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [ordered, setOrdered] = useState(false);
	const [itemType, setItemType] = useState<CollectionItemType | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		const trimmedName = name.trim();
		if (trimmedName.length === 0) {
			setError("コレクション名は必須です");
			return;
		}

		if (!itemType) {
			setError("種別を選択してください");
			return;
		}

		try {
			const created = await createMutation.mutateAsync({
				name: trimmedName,
				description: description.trim() || null,
				ordered,
				itemType,
				kind: "collection",
				visibility: "private",
			});
			navigate({ to: "/user/collections/$id", params: { id: created.id } });
		} catch (e) {
			setError(
				e instanceof Error ? e.message : "コレクションの作成に失敗しました",
			);
		}
	};

	return (
		<div className="max-w-md space-y-4">
			<Link
				to="/user/collections"
				className="inline-flex items-center gap-1 text-base-content/60 text-sm hover:text-base-content"
			>
				<ArrowLeft className="size-4" />
				コレクション一覧へ
			</Link>

			<h1 className="font-bold text-2xl">新規コレクション</h1>

			{error && (
				<Banner variant="error" dismissible onDismiss={() => setError(null)}>
					{error}
				</Banner>
			)}

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label className="label" htmlFor="new-name">
						<span className="label-text">名前</span>
					</label>
					<input
						id="new-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="input input-bordered w-full"
						maxLength={100}
						placeholder="例: 夏コミ買うリスト"
						required
						autoComplete="off"
						data-1p-ignore
						data-lpignore="true"
						data-form-type="other"
						disabled={createMutation.isPending}
					/>
				</div>

				<div>
					<p className="label-text mb-2 font-medium">
						種別 <span className="text-error">*</span>
					</p>
					<div className="grid grid-cols-2 gap-2">
						{ITEM_TYPE_OPTIONS.map((opt) => (
							<label
								key={opt.value}
								className={`flex cursor-pointer items-center gap-2 rounded-field border-2 p-3 transition-colors ${
									itemType === opt.value
										? "border-primary bg-primary/10"
										: "border-base-300 hover:border-primary/50"
								} ${createMutation.isPending ? "cursor-not-allowed opacity-50" : ""}`}
							>
								<input
									type="radio"
									className="sr-only"
									name="itemType"
									value={opt.value}
									checked={itemType === opt.value}
									onChange={() => setItemType(opt.value)}
									disabled={createMutation.isPending}
								/>
								{opt.icon}
								<span className="text-sm">{opt.label}</span>
							</label>
						))}
					</div>
					<p className="mt-1 text-base-content/50 text-xs">
						※コレクション作成後は変更できません
					</p>
				</div>

				<div>
					<label className="label" htmlFor="new-description">
						<span className="label-text">説明（任意）</span>
					</label>
					<textarea
						id="new-description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						className="textarea textarea-bordered w-full"
						maxLength={500}
						rows={3}
						placeholder="このコレクションの説明（任意・最大 500 文字）"
						disabled={createMutation.isPending}
					/>
				</div>
				<div className="form-control">
					<label className="label cursor-pointer justify-start gap-2">
						<input
							type="checkbox"
							className="checkbox checkbox-primary"
							checked={ordered}
							onChange={(e) => setOrdered(e.target.checked)}
							disabled={createMutation.isPending}
						/>
						<span className="label-text">
							並び替えを有効にする（あとから変更可能）
						</span>
					</label>
				</div>
				<button
					type="submit"
					className="btn btn-primary w-full"
					disabled={createMutation.isPending}
				>
					{createMutation.isPending ? "作成中..." : "作成"}
				</button>
			</form>
		</div>
	);
}

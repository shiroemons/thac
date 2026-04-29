import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Disc3, Music, User, UserRound } from "lucide-react";
import { PublicBreadcrumb } from "@/components/public";
import { VisibilityBadge } from "@/components/user/visibility-badge";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import { APP_NAME } from "@/lib/head";
import { type PublicCollectionDetail, publicApi } from "@/lib/public-api";

export const Route = createFileRoute("/_public/collections_/$shortId")({
	loader: async ({ params }) => {
		try {
			const collection = await publicApi.collections.getByShortId(
				params.shortId,
			);
			return { collection };
		} catch {
			return { collection: null };
		}
	},
	head: ({ loaderData }) => {
		const collection = loaderData?.collection;
		if (!collection) {
			return { meta: [{ title: `コレクション | ${APP_NAME}` }] };
		}
		const meta = [
			{ title: `${collection.name} | ${APP_NAME}` },
			{
				name: "description",
				content:
					collection.description ?? `${collection.owner.name}のコレクション`,
			},
		];
		if (collection.visibility === "unlisted") {
			meta.push({ name: "robots", content: "noindex" });
		}
		return { meta };
	},
	headers: () => CACHE_HEADERS.PUBLIC_DETAIL,
	component: PublicCollectionDetailPage,
});

function PublicCollectionDetailPage() {
	const { collection } = Route.useLoaderData();

	if (!collection) {
		return (
			<div className="space-y-6">
				<PublicBreadcrumb items={[{ label: "コレクション" }]} />
				<div className="rounded-2xl bg-base-100 p-8 text-center shadow-sm">
					<h1 className="font-bold text-2xl">コレクションが見つかりません</h1>
					<p className="mt-2 text-base-content/70">
						このURLのコレクションは存在しないか、非公開になっています
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[{ label: "コレクション" }, { label: collection.name }]}
			/>

			<CollectionHeader collection={collection} />

			<CollectionItemList collection={collection} />
		</div>
	);
}

interface CollectionHeaderProps {
	collection: PublicCollectionDetail;
}

function CollectionHeader({ collection }: CollectionHeaderProps) {
	return (
		<div className="rounded-2xl bg-base-100 p-6 shadow-sm">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="space-y-2">
					<h1 className="font-bold text-2xl">{collection.name}</h1>
					{collection.description && (
						<p className="text-base-content/60">{collection.description}</p>
					)}
					<div className="flex flex-wrap items-center gap-2 text-sm">
						<VisibilityBadge visibility={collection.visibility} />
						{collection.itemType && (
							<ItemTypeBadge itemType={collection.itemType} />
						)}
						<span className="text-base-content/50">
							{collection.items.length} 件
						</span>
					</div>
					<div className="flex items-center gap-1 text-base-content/50 text-sm">
						<User className="size-3.5" />
						<span>{collection.owner.name}</span>
					</div>
				</div>
			</div>
		</div>
	);
}

interface CollectionItemListProps {
	collection: PublicCollectionDetail;
}

function CollectionItemList({ collection }: CollectionItemListProps) {
	if (collection.items.length === 0) {
		return (
			<div className="rounded-2xl bg-base-100 p-12 text-center shadow-sm">
				<p className="text-base-content/60">
					このコレクションにはアイテムがありません
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{collection.items.map((item) => (
				<PublicCollectionItemRow key={item.id} item={item} />
			))}
		</div>
	);
}

type PublicCollectionItem = PublicCollectionDetail["items"][number];

interface PublicCollectionItemRowProps {
	item: PublicCollectionItem;
}

function PublicCollectionItemRow({ item }: PublicCollectionItemRowProps) {
	const { label, to, icon } = getItemMeta(item.targetType);

	const displayName =
		(item.target as { name?: string; title?: string } | null)?.name ??
		(item.target as { title?: string } | null)?.title ??
		"（削除されたアイテム）";

	return (
		<div className="flex items-center gap-4 rounded-field bg-base-100 p-3 shadow-sm">
			<div className="min-w-0 flex-1">
				<Link
					to={to}
					params={{ id: item.targetId }}
					className="font-medium hover:underline"
				>
					{displayName}
				</Link>
				<div className="flex items-center gap-1 text-base-content/50 text-xs">
					{icon}
					<span>{label}</span>
				</div>
				{item.note && (
					<p className="mt-1 text-base-content/60 text-sm">{item.note}</p>
				)}
			</div>
		</div>
	);
}

type ItemTypeLiteral = "track" | "release" | "circle" | "artist";

const ITEM_TYPE_META_PUBLIC: Record<
	ItemTypeLiteral,
	{
		label: string;
		to: "/tracks/$id" | "/releases/$id" | "/circles/$id" | "/artists/$id";
		icon: React.ReactNode;
		badgeClass: string;
	}
> = {
	track: {
		label: "楽曲",
		to: "/tracks/$id",
		icon: <Music className="size-3" />,
		badgeClass: "badge-primary",
	},
	release: {
		label: "アルバム",
		to: "/releases/$id",
		icon: <Disc3 className="size-3" />,
		badgeClass: "badge-secondary",
	},
	circle: {
		label: "サークル",
		to: "/circles/$id",
		icon: <BookOpen className="size-3" />,
		badgeClass: "badge-accent",
	},
	artist: {
		label: "アーティスト",
		to: "/artists/$id",
		icon: <UserRound className="size-3" />,
		badgeClass: "badge-info",
	},
};

interface ItemTypeBadgeProps {
	itemType: ItemTypeLiteral;
}

function ItemTypeBadge({ itemType }: ItemTypeBadgeProps) {
	const { label, icon, badgeClass } = ITEM_TYPE_META_PUBLIC[itemType];
	return (
		<span className={`badge badge-outline badge-xs gap-1 ${badgeClass}`}>
			{icon}
			{label}
		</span>
	);
}

function getItemMeta(targetType: ItemTypeLiteral): {
	label: string;
	to: "/tracks/$id" | "/releases/$id" | "/circles/$id" | "/artists/$id";
	icon: React.ReactNode;
} {
	return ITEM_TYPE_META_PUBLIC[targetType];
}

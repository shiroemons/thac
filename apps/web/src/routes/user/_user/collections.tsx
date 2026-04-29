import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { VisibilityBadge } from "@/components/user/visibility-badge";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import { createPageHead } from "@/lib/head";
import { userCollectionsListQueryOptions } from "@/lib/user-collections-query-options";

export const Route = createFileRoute("/user/_user/collections")({
	head: () => createPageHead("マイコレクション"),
	headers: () => CACHE_HEADERS.PRIVATE,
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(
			userCollectionsListQueryOptions({
				kind: "collection",
				excludeDefaultLiked: true,
			}),
		),
	component: CollectionsListPage,
});

function CollectionsListPage() {
	const { data } = useSuspenseQuery(
		userCollectionsListQueryOptions({
			kind: "collection",
			excludeDefaultLiked: true,
		}),
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="font-bold text-2xl">マイコレクション</h1>
				<Link to="/user/collections/new" className="btn btn-primary btn-sm">
					<Plus className="size-4" />
					新規作成
				</Link>
			</div>

			{data.items.length === 0 ? (
				<div className="rounded-field bg-base-100 p-12 text-center shadow-sm">
					<p className="text-base-content/60">
						コレクションがまだありません。新規作成してお気に入りの楽曲・アルバム・サークルをまとめましょう。
					</p>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{data.items.map((c) => (
						<Link
							key={c.id}
							to="/user/collections/$id"
							params={{ id: c.id }}
							className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
						>
							<div className="card-body">
								<h2 className="card-title text-lg">{c.name}</h2>
								{c.description && (
									<p className="line-clamp-2 text-base-content/60 text-sm">
										{c.description}
									</p>
								)}
								<div className="flex items-center gap-2 text-base-content/50 text-xs">
									<span>{c.itemCount} 件</span>
									{c.ordered && <span>・並び替え可</span>}
									<VisibilityBadge visibility={c.visibility} />
								</div>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}

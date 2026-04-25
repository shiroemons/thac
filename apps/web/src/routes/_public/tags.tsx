import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Hash, Loader2, Music, Search, Tag as TagIcon } from "lucide-react";
import { useState } from "react";
import {
	EntityDetailHeader,
	PublicBreadcrumb,
	TagCloud,
} from "@/components/public";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import { createPageHead } from "@/lib/head";
import { publicTagsListQueryOptions } from "@/lib/public-query-options";

export const Route = createFileRoute("/_public/tags")({
	head: () => createPageHead("タグ一覧"),
	headers: () => CACHE_HEADERS.PUBLIC_LIST,
	component: TagsPage,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			publicTagsListQueryOptions({ limit: 500 }),
		);
	},
});

function TagsPage() {
	const [searchQuery, setSearchQuery] = useState("");

	const { data, isLoading, error } = useQuery(
		publicTagsListQueryOptions({
			limit: 500,
			search: searchQuery || undefined,
		}),
	);

	return (
		<div className="space-y-6">
			<PublicBreadcrumb items={[{ label: "タグ" }]} />

			{/* ヘッダー */}
			<EntityDetailHeader
				gradientClass="gradient-mesh"
				icon={<TagIcon className="size-10 text-base-content/80 sm:size-12" />}
				iconRingClass="ring-base-content/20"
				title="タグ一覧"
				subtitle="楽曲に付けられたタグを探索"
			/>

			{/* タグクラウド */}
			<div className="space-y-3">
				<h2 className="flex items-center gap-2 font-bold text-xl">
					<Hash className="size-5 text-primary" />
					タグクラウド
				</h2>
				<TagCloud limit={50} />
			</div>

			{/* 検索 */}
			<div className="relative">
				<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
					<Search className="size-5 text-base-content/40" aria-hidden="true" />
				</div>
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="タグを検索..."
					className="input w-full rounded-xl pl-12"
					aria-label="タグ検索"
				/>
			</div>

			{/* タグ一覧 */}
			<div className="space-y-3">
				<h2 className="flex items-center gap-2 font-bold text-xl">
					<TagIcon className="size-5 text-primary" />
					すべてのタグ
					{data && (
						<span className="font-normal text-base-content/60 text-sm">
							({data.total}件)
						</span>
					)}
				</h2>

				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="size-8 animate-spin text-primary" />
					</div>
				) : error ? (
					<div className="rounded-2xl bg-base-100 p-8 text-center shadow-sm">
						<p className="text-error">タグの読み込みに失敗しました</p>
					</div>
				) : !data || data.data.length === 0 ? (
					<div className="rounded-2xl bg-base-100 p-8 text-center shadow-sm">
						<p className="text-base-content/60">
							{searchQuery
								? `「${searchQuery}」に一致するタグがありません`
								: "タグがありません"}
						</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-2xl bg-base-100 shadow-sm">
						<table className="table">
							<thead>
								<tr>
									<th>タグ名</th>
									<th className="text-right">使用数</th>
								</tr>
							</thead>
							<tbody>
								{data.data.map((tag) => (
									<tr
										key={tag.id}
										className="transition-colors duration-300 hover:bg-base-200/50"
									>
										<td>
											<Link
												to="/tags/$tagId"
												params={{ tagId: tag.id }}
												preload="intent"
												className="inline-flex items-center gap-2 font-medium transition-colors duration-300 hover:text-primary"
											>
												<Hash className="size-4 text-base-content/40" />
												{tag.name}
											</Link>
										</td>
										<td className="text-right">
											<span className="flex items-center justify-end gap-1 text-base-content/70">
												<Music className="size-4" />
												{tag.trackCount}曲
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}

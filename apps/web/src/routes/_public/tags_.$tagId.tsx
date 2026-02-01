import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Hash, Loader2, Music, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	EmptyState,
	EntityDetailHeader,
	GenreBadge,
	Pagination,
	PublicBreadcrumb,
	type StatItem,
	StatsCardGrid,
	TagBadge,
} from "@/components/public";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import { createPageHead } from "@/lib/head";
import { type PublicArrangeTrack, publicApi } from "@/lib/public-api";

export const Route = createFileRoute("/_public/tags_/$tagId")({
	loader: async ({ params }) => {
		try {
			const [tag, tracksRes] = await Promise.all([
				publicApi.tags.get(params.tagId),
				publicApi.tags.tracks(params.tagId, { page: 1, limit: 20 }),
			]);
			return {
				tag,
				initialTracks: tracksRes.data,
				totalTracks: tracksRes.total,
			};
		} catch {
			return { tag: null, initialTracks: [], totalTracks: 0 };
		}
	},
	head: ({ loaderData }) =>
		createPageHead(
			loaderData?.tag ? `#${loaderData.tag.name}` : "タグが見つかりません",
		),
	headers: () => CACHE_HEADERS.PUBLIC_DETAIL,
	component: TagDetailPage,
});

const PAGE_SIZE = 20;

// 役割名
const roleNames: Record<string, string> = {
	arrange: "編曲",
	compose: "作曲",
	lyrics: "作詞",
	vocal: "Vo",
	guitar: "Gt",
	bass: "Ba",
	drums: "Dr",
};

function TagDetailPage() {
	const { tagId } = Route.useParams();
	const { tag, initialTracks, totalTracks } = Route.useLoaderData();

	const [tracks, setTracks] = useState<PublicArrangeTrack[]>(initialTracks);
	const [tracksTotal, setTracksTotal] = useState(totalTracks);
	const [tracksPage, setTracksPage] = useState(1);
	const [tracksLoading, setTracksLoading] = useState(false);

	// 初期データが変わったら更新
	useEffect(() => {
		setTracks(initialTracks);
		setTracksTotal(totalTracks);
		setTracksPage(1);
	}, [initialTracks, totalTracks]);

	// トラック一覧を取得
	const fetchTracks = useCallback(
		async (page: number) => {
			if (!tag) return;
			setTracksLoading(true);
			try {
				const res = await publicApi.tags.tracks(tagId, {
					page,
					limit: PAGE_SIZE,
				});
				setTracks(res.data);
				setTracksTotal(res.total);
				setTracksPage(page);
			} catch {
				// エラー時は空配列
			} finally {
				setTracksLoading(false);
			}
		},
		[tag, tagId],
	);

	// タグが見つからない場合
	if (!tag) {
		return (
			<div className="space-y-6">
				<PublicBreadcrumb
					items={[{ label: "タグ", href: "/tags" }, { label: tagId }]}
				/>
				<div className="rounded-2xl bg-base-100 p-8 text-center shadow-sm">
					<h1 className="font-bold text-2xl">タグが見つかりません</h1>
					<p className="mt-2 text-base-content/70">
						指定されたIDのタグは存在しません
					</p>
					<Link to="/tags" preload="intent" className="btn btn-primary mt-4">
						タグ一覧に戻る
					</Link>
				</div>
			</div>
		);
	}

	const tracksTotalPages = Math.ceil(tracksTotal / PAGE_SIZE);

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[{ label: "タグ", href: "/tags" }, { label: `#${tag.name}` }]}
			/>

			{/* ヘッダー */}
			<EntityDetailHeader
				gradientClass="gradient-mesh"
				icon={<Hash className="size-10 text-base-content/80 sm:size-12" />}
				iconRingClass="ring-base-content/20"
				title={`#${tag.name}`}
				badges={[
					<TagBadge
						key="tag"
						id={tag.id}
						name={tag.name}
						className="badge-lg"
					/>,
				]}
			/>

			{/* 統計カード */}
			<div className="rounded-2xl bg-base-100 p-6 shadow-sm">
				<StatsCardGrid
					items={
						[
							{
								label: "トラック数",
								value: tag.trackCount,
								icon: <Music className="size-5" />,
								iconColorClass: "text-primary",
							},
						] satisfies StatItem[]
					}
					columns={2}
				/>
			</div>

			{/* トラック一覧 */}
			<div className="space-y-4">
				<h2 className="flex items-center gap-2 font-bold text-xl">
					<Music className="size-5 text-primary" />
					このタグが付いたトラック
					<span className="font-normal text-base-content/60 text-sm">
						({tracksTotal}件)
					</span>
				</h2>

				{tracksLoading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="size-8 animate-spin text-primary" />
					</div>
				) : tracks.length === 0 ? (
					<EmptyState type="empty" title="トラックがありません" />
				) : (
					<div className="overflow-x-auto rounded-2xl bg-base-100 shadow-sm">
						<table className="table">
							<thead>
								<tr>
									<th>タイトル</th>
									<th>サークル</th>
									<th className="hidden lg:table-cell">ジャンル</th>
									<th className="hidden md:table-cell">アーティスト</th>
									<th className="hidden sm:table-cell">頒布日</th>
								</tr>
							</thead>
							<tbody>
								{tracks.map((track) => (
									<tr
										key={track.trackId}
										className="transition-colors duration-300 hover:bg-base-200/50"
									>
										<td className="min-h-[44px]">
											<Link
												to="/tracks/$id"
												params={{ id: track.trackId }}
												preload="intent"
												className="font-medium transition-colors duration-300 hover:text-primary"
											>
												{track.trackName}
											</Link>
											{track.release && (
												<Link
													to="/releases/$id"
													params={{ id: track.release.id }}
													preload="intent"
													className="block text-base-content/60 text-sm transition-colors duration-300 hover:text-primary"
												>
													{track.release.name}
												</Link>
											)}
											{/* モバイル用ジャンル表示 */}
											{track.genres && track.genres.length > 0 && (
												<div className="mt-1 flex flex-wrap gap-1 lg:hidden">
													{track.genres.map((genre) => (
														<GenreBadge
															key={genre.code}
															code={genre.code}
															name={genre.nameJa}
															color={genre.color}
															icon={genre.icon}
														/>
													))}
												</div>
											)}
										</td>
										<td>
											{track.circles.map((circle, idx) => (
												<span key={circle.id}>
													{idx > 0 && ", "}
													<Link
														to="/circles/$id"
														params={{ id: circle.id }}
														preload="intent"
														className="transition-colors duration-300 hover:text-primary"
													>
														{circle.name}
													</Link>
												</span>
											))}
										</td>
										<td className="hidden lg:table-cell">
											{track.genres && track.genres.length > 0 && (
												<div className="flex flex-wrap gap-1">
													{track.genres.map((genre) => (
														<GenreBadge
															key={genre.code}
															code={genre.code}
															name={genre.nameJa}
															color={genre.color}
															icon={genre.icon}
														/>
													))}
												</div>
											)}
										</td>
										<td className="hidden md:table-cell">
											<div className="flex flex-wrap gap-1">
												{track.artists.map((artist) => (
													<Link
														key={artist.artistAliasId}
														to="/artists/$id"
														params={{ id: artist.artistAliasId }}
														preload="intent"
														className="inline-flex items-center gap-1 transition-colors duration-300 hover:text-primary"
													>
														<UserRound className="size-3" />
														<span>{artist.creditName}</span>
														{artist.roles.length > 0 && (
															<span className="text-base-content/60 text-xs">
																(
																{artist.roles
																	.map((r) => roleNames[r] || r)
																	.join("/")}
																)
															</span>
														)}
													</Link>
												))}
											</div>
										</td>
										<td className="hidden text-base-content/70 sm:table-cell">
											{track.release?.releaseDate && (
												<span className="flex items-center gap-1">
													<Calendar className="size-3" />
													{track.release.releaseDate}
												</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{/* ページネーション */}
				{tracksTotalPages > 1 && (
					<Pagination
						currentPage={tracksPage}
						totalPages={tracksTotalPages}
						onPageChange={(page) => fetchTracks(page)}
					/>
				)}
			</div>
		</div>
	);
}

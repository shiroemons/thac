import { createFileRoute, Link } from "@tanstack/react-router";
import { Disc3, Loader2, Music } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, Pagination, PublicBreadcrumb } from "@/components/public";
import { formatNumber } from "@/lib/format";
import { createPublicArtistHead } from "@/lib/head";
import { type PublicArtistTrack, publicApi } from "@/lib/public-api";

export const Route = createFileRoute("/_public/artists_/$id")({
	loader: async ({ params }) => {
		try {
			const artist = await publicApi.artists.get(params.id);
			return { artist };
		} catch {
			return { artist: null };
		}
	},
	head: ({ loaderData }) => createPublicArtistHead(loaderData?.artist?.name),
	component: ArtistDetailPage,
});

const PAGE_SIZE = 20;

// 名義タイプ名
const aliasTypeNames: Record<string, string> = {
	alternate: "別名義",
	unit: "ユニット",
	nickname: "愛称",
};

function ArtistDetailPage() {
	const { id } = Route.useParams();
	const { artist } = Route.useLoaderData();

	// トラック一覧の状態
	const [tracks, setTracks] = useState<PublicArtistTrack[]>([]);
	const [tracksTotal, setTracksTotal] = useState(0);
	const [tracksPage, setTracksPage] = useState(1);
	const [tracksLoading, setTracksLoading] = useState(false);
	const [tracksLoaded, setTracksLoaded] = useState(false);

	// フィルター（名義単位なので役割フィルターのみ）
	const [roleFilter, setRoleFilter] = useState<string>("all");

	// トラック一覧を取得
	const fetchTracks = useCallback(
		async (page: number, role?: string) => {
			if (!artist) return;
			setTracksLoading(true);
			try {
				const res = await publicApi.artists.tracks(id, {
					page,
					limit: PAGE_SIZE,
					role: role === "all" ? undefined : role,
				});
				setTracks(res.data);
				setTracksTotal(res.total);
				setTracksPage(page);
				setTracksLoaded(true);
			} catch {
				setTracks([]);
				setTracksTotal(0);
			} finally {
				setTracksLoading(false);
			}
		},
		[artist, id],
	);

	// 初回ロード
	useEffect(() => {
		if (!tracksLoaded && artist) {
			fetchTracks(1, roleFilter);
		}
	}, [tracksLoaded, artist, fetchTracks, roleFilter]);

	// フィルター変更時
	const handleRoleFilterChange = (value: string) => {
		setRoleFilter(value);
		fetchTracks(1, value);
	};

	// ページ変更時
	const handlePageChange = (page: number) => {
		fetchTracks(page, roleFilter);
	};

	// 名義が見つからない場合
	if (!artist) {
		return (
			<div className="space-y-6">
				<PublicBreadcrumb
					items={[{ label: "アーティスト", href: "/artists" }, { label: id }]}
				/>
				<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
					<h1 className="font-bold text-2xl">アーティストが見つかりません</h1>
					<p className="mt-2 text-base-content/70">
						指定されたIDのアーティストは存在しません
					</p>
					<Link to="/artists" className="btn btn-primary mt-4">
						アーティスト一覧に戻る
					</Link>
				</div>
			</div>
		);
	}

	const tracksTotalPages = Math.ceil(tracksTotal / PAGE_SIZE);

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[
					{ label: "アーティスト", href: "/artists" },
					{ label: artist.name },
				]}
			/>

			{/* ヘッダー */}
			<div className="rounded-lg bg-base-100 p-6 shadow-sm">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
					{/* アバター */}
					<div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-3xl text-primary">
						{artist.name.charAt(0)}
					</div>

					<div className="flex-1 space-y-2">
						<div>
							<h1 className="font-bold text-2xl sm:text-3xl">{artist.name}</h1>
							{!artist.isMainName && (
								<p className="text-base-content/70">
									{artist.artistName}
									{artist.aliasTypeCode && (
										<span className="badge badge-ghost badge-sm ml-2">
											{aliasTypeNames[artist.aliasTypeCode] ||
												artist.aliasTypeCode}
										</span>
									)}
								</p>
							)}
						</div>

						{/* 役割バッジ */}
						<div className="flex flex-wrap gap-2">
							{artist.roles.map((role) => (
								<span
									key={role.roleCode}
									className="badge badge-primary badge-outline"
								>
									{role.label}
								</span>
							))}
						</div>
					</div>
				</div>

				{/* 他名義 */}
				{artist.otherAliases.length > 0 && (
					<div className="mt-4 border-base-200 border-t pt-4">
						<p className="mb-2 text-base-content/60 text-sm">他の名義:</p>
						<div className="flex flex-wrap gap-2">
							{artist.otherAliases.map((alias) => (
								<Link
									key={alias.id}
									to="/artists/$id"
									params={{ id: alias.id }}
									className="badge badge-ghost hover:badge-primary transition-colors"
								>
									{alias.name}
									{alias.aliasTypeCode && (
										<span className="ml-1 text-xs opacity-70">
											(
											{aliasTypeNames[alias.aliasTypeCode] ||
												alias.aliasTypeCode}
											)
										</span>
									)}
									<span className="ml-1 text-xs opacity-70">
										{alias.trackCount}曲
									</span>
								</Link>
							))}
						</div>
					</div>
				)}

				{/* 統計カード */}
				<div className="mt-6 grid grid-cols-2 gap-4">
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-primary">
							<Music className="size-5" />
							<span className="font-bold text-2xl">
								{formatNumber(artist.stats.trackCount)}
							</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">トラック</p>
					</div>
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-secondary">
							<Disc3 className="size-5" />
							<span className="font-bold text-2xl">
								{formatNumber(artist.stats.releaseCount)}
							</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">リリース</p>
					</div>
				</div>
			</div>

			{/* 参加トラック */}
			<div className="space-y-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<h2 className="font-bold text-xl">参加トラック</h2>

					{/* フィルター */}
					<div className="flex flex-wrap gap-2">
						{/* 役割フィルター */}
						<select
							className="select select-bordered select-sm"
							value={roleFilter}
							onChange={(e) => handleRoleFilterChange(e.target.value)}
						>
							<option value="all">すべての役割</option>
							{artist.roles.map((role) => (
								<option key={role.roleCode} value={role.roleCode}>
									{role.label}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* トラック一覧 */}
				{tracksLoading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="size-8 animate-spin text-primary" />
					</div>
				) : tracks.length === 0 ? (
					<EmptyState
						type="filter"
						title="該当するトラックがありません"
						description="フィルター条件を変更してお試しください"
					/>
				) : (
					<div className="overflow-x-auto rounded-lg bg-base-100 shadow-sm">
						<table className="table">
							<thead>
								<tr>
									<th>曲名</th>
									<th className="hidden md:table-cell">役割</th>
									<th className="hidden sm:table-cell">リリース</th>
									<th className="hidden lg:table-cell">原曲</th>
								</tr>
							</thead>
							<tbody>
								{tracks.map((credit) => (
									<tr key={credit.id} className="hover:bg-base-200/50">
										<td>
											<div className="font-medium">{credit.track.name}</div>
										</td>
										<td className="hidden md:table-cell">
											<div className="flex flex-wrap gap-1">
												{credit.roles.map((role) => (
													<span
														key={role.roleCode}
														className="badge badge-outline badge-xs"
													>
														{role.label}
													</span>
												))}
											</div>
										</td>
										<td className="hidden sm:table-cell">
											<div className="text-base-content/70 text-sm">
												{credit.release.name}
											</div>
											<div className="flex gap-1">
												{credit.circles.map((circle) => (
													<Link
														key={circle.id}
														to="/circles/$id"
														params={{ id: circle.id }}
														className="text-base-content/50 text-xs hover:text-primary"
													>
														{circle.name}
													</Link>
												))}
											</div>
										</td>
										<td className="hidden lg:table-cell">
											{credit.originalSong ? (
												<Link
													to="/original-songs/$id"
													params={{ id: credit.originalSong.id }}
													className="text-base-content/70 text-sm hover:text-primary"
												>
													{credit.originalSong.name}
												</Link>
											) : (
												"-"
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
						onPageChange={handlePageChange}
					/>
				)}
			</div>
		</div>
	);
}

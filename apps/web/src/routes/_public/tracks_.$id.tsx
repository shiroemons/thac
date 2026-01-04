import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ChevronLeft,
	ChevronRight,
	Clock,
	Disc3,
	GitFork,
	Music,
} from "lucide-react";
import { useMemo } from "react";
import { PublicationLinks, PublicBreadcrumb } from "@/components/public";
import { getPublicationsForTrack } from "@/mocks/publication";
import { getTrackWithDetails } from "@/mocks/release";
import { roleNames, type TrackCredit } from "@/types/release";

export const Route = createFileRoute("/_public/tracks_/$id")({
	component: TrackDetailPage,
});

/**
 * 秒数を「分:秒」形式に変換
 */
function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function TrackDetailPage() {
	const { id } = Route.useParams();

	// トラック詳細を取得
	const track = getTrackWithDetails(id);

	// 配信リンクを取得
	const publications = getPublicationsForTrack(id);

	// クレジットを役割別にグループ化
	const creditsByRole = useMemo(() => {
		if (!track) return new Map<string, TrackCredit[]>();

		const grouped = new Map<string, TrackCredit[]>();
		for (const credit of track.credits) {
			for (const role of credit.roles) {
				if (!grouped.has(role.roleCode)) {
					grouped.set(role.roleCode, []);
				}
				// 重複を避けて追加
				const existing = grouped.get(role.roleCode);
				if (existing && !existing.some((c) => c.artistId === credit.artistId)) {
					existing.push(credit);
				}
			}
		}
		return grouped;
	}, [track]);

	// トラックが見つからない場合
	if (!track) {
		return (
			<div className="space-y-6">
				<PublicBreadcrumb
					items={[{ label: "リリース", href: "/releases" }, { label: id }]}
				/>
				<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
					<h1 className="font-bold text-2xl">トラックが見つかりません</h1>
					<p className="mt-2 text-base-content/70">
						指定されたIDのトラックは存在しません
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[
					{ label: "リリース", href: "/releases" },
					{
						label: track.release.name,
						href: `/releases/${track.release.id}`,
					},
					{ label: track.name },
				]}
			/>

			{/* ヘッダー */}
			<div className="rounded-lg bg-base-100 p-6 shadow-sm">
				<div className="space-y-3">
					{/* トラック番号とタイトル */}
					<div className="flex flex-wrap items-center gap-2">
						<span className="badge badge-outline badge-lg">
							Track {track.trackNumber.toString().padStart(2, "0")}
						</span>
						<h1 className="font-bold text-2xl sm:text-3xl">{track.name}</h1>
					</div>

					{/* リリース情報 */}
					<div className="flex flex-wrap items-center gap-4 text-base-content/60 text-sm">
						<Link
							to="/releases/$id"
							params={{ id: track.release.id }}
							className="flex items-center gap-1 hover:text-primary"
						>
							<Disc3 className="size-4" />
							{track.release.name}
						</Link>
						{track.disc && (
							<span className="flex items-center gap-1">
								<Disc3 className="size-4" />
								Disc {track.disc.discNumber}
								{track.disc.discName && ` - ${track.disc.discName}`}
							</span>
						)}
						{track.event && (
							<Link
								to="/events/$id"
								params={{ id: track.event.id }}
								className="flex items-center gap-1 hover:text-primary"
							>
								{track.event.name}
							</Link>
						)}
					</div>
				</div>
			</div>

			{/* 配信リンク */}
			{publications.length > 0 && (
				<div className="rounded-lg bg-base-100 p-6 shadow-sm">
					<PublicationLinks publications={publications} showEmbeds />
				</div>
			)}

			{/* クレジット */}
			{track.credits.length > 0 && (
				<div className="space-y-3">
					<h2 className="font-bold text-xl">クレジット</h2>
					<div className="rounded-lg bg-base-100 p-4 shadow-sm">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{Array.from(creditsByRole.entries()).map(
								([roleCode, credits]) => (
									<div key={roleCode} className="space-y-1">
										<p className="font-medium text-base-content/70 text-sm">
											{roleNames[roleCode] ?? roleCode}
										</p>
										<div className="flex flex-wrap gap-x-2 gap-y-1">
											{credits.map((credit, idx) => (
												<span key={credit.artistId}>
													{idx > 0 && (
														<span className="text-base-content/40"> / </span>
													)}
													<Link
														to="/artists/$id"
														params={{ id: credit.artistId }}
														className="hover:text-primary"
													>
														{credit.creditName}
													</Link>
												</span>
											))}
										</div>
									</div>
								),
							)}
						</div>
					</div>
				</div>
			)}

			{/* 原曲 */}
			{track.officialSongs.length > 0 && (
				<div className="space-y-3">
					<h2 className="flex items-center gap-2 font-bold text-xl">
						<Music className="size-5" />
						原曲
					</h2>
					<div className="rounded-lg bg-base-100 shadow-sm">
						<ul className="divide-y divide-base-200">
							{track.officialSongs.map((os, idx) => (
								<li
									key={os.officialSongId ?? idx}
									className="flex items-start gap-3 p-4"
								>
									{/* メドレー順序 */}
									{os.partPosition !== null && (
										<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-sm">
											{os.partPosition}
										</span>
									)}

									<div className="min-w-0 flex-1">
										{/* 曲名 */}
										<div className="flex flex-wrap items-center gap-2">
											{os.officialSongId ? (
												<Link
													to="/original-songs/$id"
													params={{ id: os.officialSongId }}
													className="font-medium hover:text-primary"
												>
													{os.songName}
												</Link>
											) : (
												<span className="font-medium">{os.songName}</span>
											)}
											<span className="text-base-content/50 text-sm">
												（{os.workName}）
											</span>
										</div>

										{/* 時間範囲 */}
										{(os.startSecond !== null || os.endSecond !== null) && (
											<div className="mt-1 flex items-center gap-1 text-base-content/60 text-sm">
												<Clock className="size-3" />
												<span>
													{os.startSecond !== null
														? formatTime(os.startSecond)
														: "?"}
													{" - "}
													{os.endSecond !== null
														? formatTime(os.endSecond)
														: "?"}
												</span>
											</div>
										)}
									</div>
								</li>
							))}
						</ul>
					</div>
				</div>
			)}

			{/* 派生関係 */}
			{track.parentTracks.length > 0 && (
				<div className="space-y-3">
					<h2 className="flex items-center gap-2 font-bold text-xl">
						<GitFork className="size-5" />
						派生元
					</h2>
					<div className="rounded-lg bg-base-100 shadow-sm">
						<ul className="divide-y divide-base-200">
							{track.parentTracks.map((derivation) => (
								<li
									key={derivation.parentTrackId}
									className="flex items-center gap-3 p-4"
								>
									<Link
										to="/tracks/$id"
										params={{ id: derivation.parentTrackId }}
										className="font-medium hover:text-primary"
									>
										{derivation.parentTrackName}
									</Link>
									<span className="text-base-content/50 text-sm">
										（{derivation.parentReleaseName}）
									</span>
								</li>
							))}
						</ul>
					</div>
				</div>
			)}

			{/* 前後のトラックナビゲーション */}
			<div className="flex items-center justify-between gap-4">
				{track.siblingTracks.prev ? (
					<Link
						to="/tracks/$id"
						params={{ id: track.siblingTracks.prev.id }}
						className="btn btn-ghost btn-sm gap-1"
					>
						<ChevronLeft className="size-4" />
						<span className="hidden sm:inline">
							{track.siblingTracks.prev.name}
						</span>
						<span className="sm:hidden">前のトラック</span>
					</Link>
				) : (
					<div />
				)}
				{track.siblingTracks.next ? (
					<Link
						to="/tracks/$id"
						params={{ id: track.siblingTracks.next.id }}
						className="btn btn-ghost btn-sm gap-1"
					>
						<span className="hidden sm:inline">
							{track.siblingTracks.next.name}
						</span>
						<span className="sm:hidden">次のトラック</span>
						<ChevronRight className="size-4" />
					</Link>
				) : (
					<div />
				)}
			</div>
		</div>
	);
}

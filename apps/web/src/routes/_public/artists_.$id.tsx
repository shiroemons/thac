import { createFileRoute, Link } from "@tanstack/react-router";
import { Disc3, Music, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState, PublicBreadcrumb } from "@/components/public";
import { createPublicArtistHead } from "@/lib/head";

// モックアーティスト取得関数（loader用）
function getArtist(id: string) {
	return mockArtists[id] ?? null;
}

export const Route = createFileRoute("/_public/artists_/$id")({
	loader: ({ params }) => ({ artist: getArtist(params.id) }),
	head: ({ loaderData }) => createPublicArtistHead(loaderData?.artist?.name),
	component: ArtistDetailPage,
});

// アーティストデータ型（スキーマ準拠）
interface Artist {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	sortName: string | null;
	nameInitial: string | null;
	initialScript: string;
	notes: string | null;
}

// アーティスト別名義データ型
interface ArtistAlias {
	id: string;
	artistId: string;
	name: string;
	aliasTypeCode: string | null;
	nameInitial: string | null;
	initialScript: string;
}

// クレジットデータ型
interface TrackCredit {
	id: string;
	trackId: string;
	artistId: string;
	creditName: string;
	artistAliasId: string | null;
	aliasTypeCode: string | null;
	roles: Array<{ roleCode: string; label: string }>;
	track: {
		id: string;
		name: string;
	};
	release: {
		id: string;
		name: string;
		releaseDate: string | null;
	};
	circles: Array<{
		id: string;
		name: string;
	}>;
	originalSong: {
		id: string;
		name: string;
	} | null;
}

// 名義別統計
interface AliasStats {
	aliasId: string | null;
	creditName: string;
	trackCount: number;
}

// 関連アーティスト
interface RelatedArtist {
	id: string;
	name: string;
	collaborationCount: number;
}

// モックデータ - アーティスト
const mockArtists: Record<string, Artist> = {
	"artist-arm": {
		id: "artist-arm",
		name: "ARM",
		nameJa: null,
		nameEn: "ARM",
		sortName: "ARM",
		nameInitial: "A",
		initialScript: "latin",
		notes: "IOSYSのメインコンポーザー。東方アレンジの代表的なクリエイター。",
	},
	"artist-miko": {
		id: "artist-miko",
		name: "miko",
		nameJa: null,
		nameEn: "miko",
		sortName: "miko",
		nameInitial: "M",
		initialScript: "latin",
		notes: "IOSYSのメインボーカリスト。",
	},
	"artist-beatmario": {
		id: "artist-beatmario",
		name: "ビートまりお",
		nameJa: "ビートまりお",
		nameEn: "beatMARIO",
		sortName: "ビートマリオ",
		nameInitial: "ヒ",
		initialScript: "katakana",
		notes: "COOL&CREATE主宰。",
	},
};

// モックデータ - 別名義
const mockAliases: Record<string, ArtistAlias[]> = {
	"artist-arm": [
		{
			id: "alias-1",
			artistId: "artist-arm",
			name: "夕野ヨシミ",
			aliasTypeCode: "alternate",
			nameInitial: "ユ",
			initialScript: "katakana",
		},
		{
			id: "alias-2",
			artistId: "artist-arm",
			name: "ARM+夕野ヨシミ",
			aliasTypeCode: "unit",
			nameInitial: "A",
			initialScript: "latin",
		},
	],
};

// モックデータ - クレジット
const mockCredits: Record<string, TrackCredit[]> = {
	"artist-arm": [
		{
			id: "credit-1",
			trackId: "track-1",
			artistId: "artist-arm",
			creditName: "ARM",
			artistAliasId: null,
			aliasTypeCode: null,
			roles: [
				{ roleCode: "arrange", label: "編曲" },
				{ roleCode: "lyrics", label: "作詞" },
			],
			track: { id: "track-1", name: "最終鬼畜妹フランドール・S" },
			release: { id: "rel-1", name: "東方乙女囃子", releaseDate: "2006-12-31" },
			circles: [{ id: "circle-iosys", name: "IOSYS" }],
			originalSong: { id: "th06-15", name: "U.N.オーエンは彼女なのか？" },
		},
		{
			id: "credit-2",
			trackId: "track-2",
			artistId: "artist-arm",
			creditName: "ARM",
			artistAliasId: null,
			aliasTypeCode: null,
			roles: [
				{ roleCode: "arrange", label: "編曲" },
				{ roleCode: "lyrics", label: "作詞" },
			],
			track: { id: "track-2", name: "チルノのパーフェクトさんすう教室" },
			release: { id: "rel-2", name: "東方氷雪歌集", releaseDate: "2007-08-17" },
			circles: [{ id: "circle-iosys", name: "IOSYS" }],
			originalSong: { id: "th06-05", name: "おてんば恋娘" },
		},
		{
			id: "credit-3",
			trackId: "track-3",
			artistId: "artist-arm",
			creditName: "ARM",
			artistAliasId: null,
			aliasTypeCode: null,
			roles: [{ roleCode: "arrange", label: "編曲" }],
			track: { id: "track-3", name: "魔理沙は大変なものを盗んでいきました" },
			release: { id: "rel-1", name: "東方乙女囃子", releaseDate: "2006-12-31" },
			circles: [{ id: "circle-iosys", name: "IOSYS" }],
			originalSong: { id: "th07-xx", name: "人形裁判" },
		},
		{
			id: "credit-4",
			trackId: "track-4",
			artistId: "artist-arm",
			creditName: "夕野ヨシミ",
			artistAliasId: "alias-1",
			aliasTypeCode: "alternate",
			roles: [{ roleCode: "vocal", label: "Vo" }],
			track: { id: "track-4", name: "ウサテイ" },
			release: { id: "rel-3", name: "東方萃奏楽", releaseDate: "2008-08-16" },
			circles: [{ id: "circle-iosys", name: "IOSYS" }],
			originalSong: { id: "th08-xx", name: "狂気の瞳 〜 Invisible Full Moon" },
		},
		{
			id: "credit-5",
			trackId: "track-5",
			artistId: "artist-arm",
			creditName: "夕野ヨシミ",
			artistAliasId: "alias-1",
			aliasTypeCode: "alternate",
			roles: [{ roleCode: "vocal", label: "Vo" }],
			track: { id: "track-5", name: "Help me, ERINNNNNN!!" },
			release: { id: "rel-1", name: "東方乙女囃子", releaseDate: "2006-12-31" },
			circles: [{ id: "circle-iosys", name: "IOSYS" }],
			originalSong: { id: "th08-yy", name: "竹取飛翔 〜 Lunatic Princess" },
		},
	],
};

// モックデータ - 関連アーティスト
const mockRelatedArtists: Record<string, RelatedArtist[]> = {
	"artist-arm": [
		{ id: "artist-miko", name: "miko", collaborationCount: 156 },
		{ id: "artist-quim", name: "quim", collaborationCount: 45 },
		{ id: "artist-fujimaru", name: "藤山晃太郎", collaborationCount: 32 },
		{ id: "artist-3l", name: "3L", collaborationCount: 28 },
	],
};

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

// 名義タイプ名
const aliasTypeNames: Record<string, string> = {
	alternate: "別名義",
	unit: "ユニット",
	nickname: "愛称",
};

// フィルタータイプ
type AliasFilter = "all" | string; // "all" or aliasId
type RoleFilter = "all" | string;

function ArtistDetailPage() {
	const { id } = Route.useParams();
	const [aliasFilter, setAliasFilter] = useState<AliasFilter>("all");
	const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

	// モックデータから取得
	const artist = mockArtists[id];
	const aliases = mockAliases[id] || [];
	const credits = mockCredits[id] || [];
	const relatedArtists = mockRelatedArtists[id] || [];

	// 名義別統計を計算
	const aliasStats = useMemo((): AliasStats[] => {
		const statsMap = new Map<string, { creditName: string; count: number }>();

		for (const credit of credits) {
			const key = credit.artistAliasId || "__main__";
			const existing = statsMap.get(key);
			if (existing) {
				existing.count++;
			} else {
				statsMap.set(key, { creditName: credit.creditName, count: 1 });
			}
		}

		return Array.from(statsMap.entries()).map(([aliasId, data]) => ({
			aliasId: aliasId === "__main__" ? null : aliasId,
			creditName: data.creditName,
			trackCount: data.count,
		}));
	}, [credits]);

	// 利用可能な役割を抽出
	const availableRoles = useMemo(() => {
		const roles = new Set<string>();
		for (const credit of credits) {
			for (const role of credit.roles) {
				roles.add(role.roleCode);
			}
		}
		return Array.from(roles);
	}, [credits]);

	// フィルター適用
	const filteredCredits = useMemo(() => {
		return credits.filter((credit) => {
			// 名義フィルター
			if (aliasFilter !== "all") {
				if (aliasFilter === "__main__" && credit.artistAliasId !== null) {
					return false;
				}
				if (
					aliasFilter !== "__main__" &&
					credit.artistAliasId !== aliasFilter
				) {
					return false;
				}
			}

			// 役割フィルター
			if (roleFilter !== "all") {
				if (!credit.roles.some((r) => r.roleCode === roleFilter)) {
					return false;
				}
			}

			return true;
		});
	}, [credits, aliasFilter, roleFilter]);

	// 統計計算
	const stats = useMemo(() => {
		const releaseIds = new Set(credits.map((c) => c.release.id));
		const circleIds = new Set(
			credits.flatMap((c) => c.circles.map((ci) => ci.id)),
		);
		return {
			trackCount: credits.length,
			releaseCount: releaseIds.size,
			circleCount: circleIds.size,
		};
	}, [credits]);

	// アーティストが見つからない場合
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
						{artist.nameInitial || artist.name.charAt(0)}
					</div>

					<div className="flex-1 space-y-2">
						<div>
							<h1 className="font-bold text-2xl sm:text-3xl">{artist.name}</h1>
							{artist.nameJa && artist.nameJa !== artist.name && (
								<p className="text-base-content/70">{artist.nameJa}</p>
							)}
						</div>

						{/* 役割バッジ */}
						<div className="flex flex-wrap gap-2">
							{availableRoles.map((role) => (
								<span key={role} className="badge badge-primary badge-outline">
									{roleNames[role] || role}
								</span>
							))}
						</div>

						{artist.notes && (
							<p className="text-base-content/60 text-sm">{artist.notes}</p>
						)}
					</div>
				</div>

				{/* 別名義 */}
				{aliases.length > 0 && (
					<div className="mt-4 border-base-200 border-t pt-4">
						<p className="mb-2 text-base-content/60 text-sm">別名義:</p>
						<div className="flex flex-wrap gap-2">
							{aliases.map((alias) => (
								<span key={alias.id} className="badge badge-ghost">
									{alias.name}
									{alias.aliasTypeCode && (
										<span className="ml-1 text-xs opacity-70">
											(
											{aliasTypeNames[alias.aliasTypeCode] ||
												alias.aliasTypeCode}
											)
										</span>
									)}
								</span>
							))}
						</div>
					</div>
				)}

				{/* 統計カード */}
				<div className="mt-6 grid grid-cols-3 gap-4">
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-primary">
							<Music className="size-5" />
							<span className="font-bold text-2xl">{stats.trackCount}</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">トラック</p>
					</div>
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-secondary">
							<Disc3 className="size-5" />
							<span className="font-bold text-2xl">{stats.releaseCount}</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">リリース</p>
					</div>
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-accent">
							<Users className="size-5" />
							<span className="font-bold text-2xl">{stats.circleCount}</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">サークル</p>
					</div>
				</div>
			</div>

			{/* 参加トラック */}
			<div className="space-y-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<h2 className="font-bold text-xl">参加トラック</h2>

					{/* フィルター */}
					<div className="flex flex-wrap gap-2">
						{/* 名義フィルター */}
						<select
							className="select select-bordered select-sm"
							value={aliasFilter}
							onChange={(e) => setAliasFilter(e.target.value)}
						>
							<option value="all">すべての名義</option>
							{aliasStats.map((stat) => (
								<option
									key={stat.aliasId || "__main__"}
									value={stat.aliasId || "__main__"}
								>
									{stat.creditName} ({stat.trackCount})
								</option>
							))}
						</select>

						{/* 役割フィルター */}
						<select
							className="select select-bordered select-sm"
							value={roleFilter}
							onChange={(e) => setRoleFilter(e.target.value)}
						>
							<option value="all">すべての役割</option>
							{availableRoles.map((role) => (
								<option key={role} value={role}>
									{roleNames[role] || role}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* トラック一覧 */}
				<div className="overflow-x-auto rounded-lg bg-base-100 shadow-sm">
					<table className="table">
						<thead>
							<tr>
								<th>曲名</th>
								<th>名義</th>
								<th className="hidden md:table-cell">役割</th>
								<th className="hidden sm:table-cell">リリース</th>
								<th className="hidden lg:table-cell">原曲</th>
							</tr>
						</thead>
						<tbody>
							{filteredCredits.map((credit) => (
								<tr key={credit.id} className="hover:bg-base-200/50">
									<td>
										<div className="font-medium">{credit.track.name}</div>
									</td>
									<td>
										<span
											className={`badge badge-sm ${
												credit.artistAliasId
													? "badge-ghost"
													: "badge-primary badge-outline"
											}`}
										>
											{credit.creditName}
										</span>
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

				{filteredCredits.length === 0 && (
					<EmptyState
						type="filter"
						title="該当するトラックがありません"
						description="フィルター条件を変更してお試しください"
					/>
				)}
			</div>

			{/* 関連アーティスト */}
			{relatedArtists.length > 0 && (
				<div className="space-y-4">
					<h2 className="font-bold text-xl">関連アーティスト</h2>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
						{relatedArtists.map((related) => (
							<Link
								key={related.id}
								to="/artists/$id"
								params={{ id: related.id }}
								className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
							>
								<div className="card-body p-4">
									<h3 className="card-title text-base">{related.name}</h3>
									<p className="text-base-content/60 text-sm">
										共演: {related.collaborationCount}曲
									</p>
								</div>
							</Link>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

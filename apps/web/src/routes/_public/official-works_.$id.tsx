import { createFileRoute, Link } from "@tanstack/react-router";
import {
	BookOpen,
	Disc3,
	ExternalLink,
	Gamepad2,
	Music,
	Package,
	TrendingUp,
} from "lucide-react";
import { PublicBreadcrumb } from "@/components/public";
import { createPublicOfficialWorkHead } from "@/lib/head";
import {
	getArrangeCount,
	getSongsByWorkId,
	getWorkById,
	productTypes,
} from "@/mocks/official";
import type { ProductType } from "@/types/official";

export const Route = createFileRoute("/_public/official-works_/$id")({
	loader: ({ params }) => ({ work: getWorkById(params.id) }),
	head: ({ loaderData }) =>
		createPublicOfficialWorkHead(loaderData?.work?.name),
	component: OfficialWorkDetailPage,
});

// 外部リンクデータ型（モック）
interface OfficialWorkLink {
	id: string;
	officialWorkId: string;
	platformCode: string;
	url: string;
	sortOrder: number;
}

// モックデータ - 外部リンク
const mockWorkLinks: Record<string, OfficialWorkLink[]> = {
	"0201": [
		{
			id: "wl-0201-1",
			officialWorkId: "0201",
			platformCode: "official",
			url: "https://www16.big.or.jp/~zun/html/th06.html",
			sortOrder: 1,
		},
	],
};

// カテゴリ設定
interface CategoryConfig {
	label: string;
	icon: React.ReactNode;
	badgeClass: string;
}

const categoryConfig: Record<ProductType, CategoryConfig> = {
	pc98: {
		label: "PC-98",
		icon: <Gamepad2 className="size-4" />,
		badgeClass: "badge-primary",
	},
	windows: {
		label: "Windows",
		icon: <Gamepad2 className="size-4" />,
		badgeClass: "badge-primary",
	},
	zuns_music_collection: {
		label: "ZUN's Music Collection",
		icon: <Disc3 className="size-4" />,
		badgeClass: "badge-secondary",
	},
	akyus_untouched_score: {
		label: "幺樂団の歴史",
		icon: <Disc3 className="size-4" />,
		badgeClass: "badge-secondary",
	},
	commercial_books: {
		label: "商業書籍",
		icon: <BookOpen className="size-4" />,
		badgeClass: "badge-accent",
	},
	tasofro: {
		label: "黄昏フロンティア",
		icon: <Gamepad2 className="size-4" />,
		badgeClass: "badge-info",
	},
	other: {
		label: "その他",
		icon: <Package className="size-4" />,
		badgeClass: "badge-ghost",
	},
};

// プラットフォーム名
const platformNames: Record<string, string> = {
	official: "公式サイト",
	wikipedia: "Wikipedia",
	thwiki: "東方Wiki",
};

function OfficialWorkDetailPage() {
	const { id } = Route.useParams();
	const { work } = Route.useLoaderData();
	const songs = work ? getSongsByWorkId(work.id) : [];
	const songsWithArrangeCount = songs.map((song) => ({
		...song,
		arrangeCount: getArrangeCount(song.id),
	}));
	const links = mockWorkLinks[id] || [];

	// 統計計算
	const stats = {
		songCount: songsWithArrangeCount.length,
		arrangeCount: songsWithArrangeCount.reduce(
			(sum, song) => sum + song.arrangeCount,
			0,
		),
	};

	// 作品が見つからない場合
	if (!work) {
		return (
			<div className="space-y-6">
				<PublicBreadcrumb
					items={[
						{ label: "公式作品", href: "/official-works" },
						{ label: id },
					]}
				/>
				<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
					<h1 className="font-bold text-2xl">作品が見つかりません</h1>
					<p className="mt-2 text-base-content/70">
						指定されたIDの作品は存在しません
					</p>
					<Link to="/official-works" className="btn btn-primary mt-4">
						作品一覧に戻る
					</Link>
				</div>
			</div>
		);
	}

	const category = categoryConfig[work.productType];
	const productTypeInfo = productTypes.find(
		(pt) => pt.code === work.productType,
	);

	return (
		<div className="space-y-6">
			<PublicBreadcrumb
				items={[
					{ label: "公式作品", href: "/official-works" },
					{
						label: productTypeInfo?.name || category.label,
						href: `/official-works?type=${work.productType}`,
					},
					{ label: work.shortName },
				]}
			/>

			{/* ヘッダー */}
			<div className="rounded-lg bg-base-100 p-6 shadow-sm">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="font-bold text-2xl sm:text-3xl">
								{work.shortName}
							</h1>
							<span className={`badge gap-1 ${category.badgeClass}`}>
								{category.icon}
								{category.label}
							</span>
						</div>
						<p className="text-base-content/70">{work.name}</p>
						<div className="flex flex-wrap gap-4 text-base-content/60 text-sm">
							<span>No.{work.seriesNumber}</span>
						</div>
					</div>

					{/* 外部リンク + 原曲一覧リンク */}
					<div className="flex flex-wrap gap-2">
						{links.map((link) => (
							<a
								key={link.id}
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								className="btn btn-outline btn-sm gap-1"
							>
								<ExternalLink className="size-3" />
								{platformNames[link.platformCode] || link.platformCode}
							</a>
						))}
						<Link
							to="/original-songs"
							search={{ type: work.productType }}
							className="btn btn-outline btn-sm gap-1"
						>
							<Music className="size-4" />
							原曲一覧
						</Link>
					</div>
				</div>

				{/* 統計カード */}
				<div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-2">
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-primary">
							<Music className="size-5" />
							<span className="font-bold text-2xl">{stats.songCount}</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">収録曲</p>
					</div>
					<div className="rounded-lg bg-base-200/50 p-4 text-center">
						<div className="flex items-center justify-center gap-2 text-secondary">
							<TrendingUp className="size-5" />
							<span className="font-bold text-2xl">
								{stats.arrangeCount.toLocaleString()}
							</span>
						</div>
						<p className="mt-1 text-base-content/70 text-sm">アレンジ総数</p>
					</div>
				</div>
			</div>

			{/* 収録曲一覧 */}
			<div className="space-y-4">
				<h2 className="font-bold text-xl">収録曲</h2>
				{songsWithArrangeCount.length === 0 ? (
					<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
						<p className="text-base-content/70">
							楽曲データはまだ登録されていません
						</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-lg bg-base-100 shadow-sm">
						<table className="table">
							<thead>
								<tr>
									<th className="w-16">No.</th>
									<th>曲名</th>
									<th className="hidden sm:table-cell">作曲</th>
									<th className="w-32 text-right">アレンジ数</th>
								</tr>
							</thead>
							<tbody>
								{songsWithArrangeCount
									.sort((a, b) => a.trackNumber - b.trackNumber)
									.map((song) => (
										<tr key={song.id} className="hover:bg-base-200/50">
											<td className="text-base-content/50">
												{song.trackNumber.toString().padStart(2, "0")}
											</td>
											<td>
												<Link
													to="/original-songs/$id"
													params={{ id: song.id }}
													className="hover:text-primary"
												>
													<div className="font-medium">{song.name}</div>
												</Link>
											</td>
											<td className="hidden text-base-content/70 sm:table-cell">
												{song.composer || "-"}
											</td>
											<td className="text-right">
												<span className="font-medium text-primary">
													{song.arrangeCount.toLocaleString()}
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

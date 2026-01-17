/**
 * 統計ページ用スケルトンコンポーネント
 * Suspense境界のfallbackとして使用
 */

// 静的配列を定義（インデックスキー問題を回避）
const SKELETON_ITEMS_5 = [0, 1, 2, 3, 4] as const;

/** 統計カードのスケルトン（5枚分） */
export function StatCardsSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
			{SKELETON_ITEMS_5.map((i) => (
				<div
					key={i}
					className="glass-card flex flex-col gap-3 rounded-2xl p-5 shadow-sm"
				>
					<div className="flex items-center justify-between">
						<div className="h-11 w-11 animate-pulse rounded-xl bg-base-content/10" />
					</div>
					<div>
						<div className="h-8 w-20 animate-pulse rounded bg-base-content/10" />
						<div className="mt-2 h-4 w-16 animate-pulse rounded bg-base-content/10" />
					</div>
				</div>
			))}
		</div>
	);
}

/** ランキングセクションのスケルトン（1セクション分） */
export function RankingSectionSkeleton() {
	return (
		<div className="glass-card overflow-hidden rounded-2xl shadow-sm">
			{/* Header */}
			<div className="flex items-center justify-between border-base-content/10 border-b p-5">
				<div className="flex items-center gap-2">
					<div className="h-5 w-5 animate-pulse rounded bg-base-content/10" />
					<div className="h-5 w-24 animate-pulse rounded bg-base-content/10" />
				</div>
				<div className="h-4 w-16 animate-pulse rounded bg-base-content/10" />
			</div>
			{/* Items */}
			<div className="divide-y divide-base-content/5 px-2 py-1">
				{SKELETON_ITEMS_5.map((i) => (
					<div key={i} className="flex items-center gap-3 p-3">
						<div className="h-8 w-8 animate-pulse rounded-lg bg-base-content/10" />
						<div className="h-4 flex-1 animate-pulse rounded bg-base-content/10" />
						<div className="h-5 w-16 animate-pulse rounded-full bg-base-content/10" />
					</div>
				))}
			</div>
		</div>
	);
}

/** ランキング3セクションのスケルトン */
export function RankingsSkeleton() {
	return (
		<div className="grid gap-6 lg:grid-cols-3">
			<RankingSectionSkeleton />
			<RankingSectionSkeleton />
			<RankingSectionSkeleton />
		</div>
	);
}

/** 最近の更新テーブルのスケルトン */
export function RecentUpdatesSkeleton() {
	return (
		<div className="glass-card overflow-hidden rounded-2xl shadow-sm">
			{/* Header */}
			<div className="flex items-center justify-between border-base-content/10 border-b p-5">
				<div className="flex items-center gap-2">
					<div className="h-5 w-5 animate-pulse rounded bg-base-content/10" />
					<div className="h-5 w-24 animate-pulse rounded bg-base-content/10" />
				</div>
			</div>
			{/* Table */}
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-base-content/5 border-b text-left text-base-content/60 text-sm">
							<th className="px-5 py-3 font-medium">状態</th>
							<th className="px-5 py-3 font-medium">タイトル</th>
							<th className="px-5 py-3 font-medium">サークル</th>
							<th className="px-5 py-3 font-medium">日付</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-base-content/5">
						{SKELETON_ITEMS_5.map((i) => (
							<tr key={i}>
								<td className="px-5 py-4">
									<div className="h-6 w-14 animate-pulse rounded-full bg-base-content/10" />
								</td>
								<td className="px-5 py-4">
									<div className="h-4 w-48 animate-pulse rounded bg-base-content/10" />
								</td>
								<td className="px-5 py-4">
									<div className="h-4 w-24 animate-pulse rounded bg-base-content/10" />
								</td>
								<td className="px-5 py-4">
									<div className="h-4 w-20 animate-pulse rounded bg-base-content/10" />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

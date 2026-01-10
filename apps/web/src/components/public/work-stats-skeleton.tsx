import { Skeleton } from "@/components/ui/skeleton";

export function WorkStatsSkeleton() {
	return (
		<div className="space-y-4">
			<div className="space-y-6 rounded-lg border-2 border-base-content/20 bg-base-100 p-6 shadow-sm">
				{/* タイトル行 */}
				<Skeleton className="h-7 w-24" />

				{/* コントロール行 */}
				<div className="flex items-center justify-between">
					<Skeleton className="h-8 w-24" />
					<Skeleton className="h-8 w-40" />
					<Skeleton className="hidden h-8 w-20 md:block" />
				</div>

				{/* チャート領域 */}
				<div className="min-h-[400px] space-y-3">
					{/* 横棒グラフのスケルトン（5行） */}
					{[80, 65, 50, 40, 30].map((width) => (
						<div key={width} className="flex items-center gap-4">
							<Skeleton className="h-5 w-28" />
							<Skeleton className="h-8" style={{ width: `${width}%` }} />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

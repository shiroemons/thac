import type * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DataTableSkeletonProps extends React.ComponentProps<"div"> {
	rows?: number;
	columns?: number;
	showActionBar?: boolean;
	showPagination?: boolean;
}

function DataTableSkeleton({
	rows = 5,
	columns = 4,
	showActionBar = true,
	showPagination = true,
	className,
	...props
}: DataTableSkeletonProps) {
	return (
		<div
			data-slot="data-table-skeleton"
			className={cn("space-y-4", className)}
			{...props}
		>
			{/* Action Bar Skeleton */}
			{showActionBar && (
				<div className="flex items-center justify-between gap-3 p-4">
					<div className="flex items-center gap-3">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-8 w-40" />
					</div>
					<Skeleton className="h-8 w-24" />
				</div>
			)}

			{/* Table Skeleton */}
			<div className="overflow-hidden">
				{/* Header */}
				<div className="flex gap-4 border-base-300 border-b bg-base-200/50 px-4 py-3">
					{Array.from({ length: columns }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: Skeleton placeholder
						<Skeleton key={i} className="h-4 flex-1" />
					))}
				</div>

				{/* Rows */}
				{Array.from({ length: rows }).map((_, rowIndex) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: Skeleton placeholder
						key={rowIndex}
						className="flex gap-4 border-base-300 border-b px-4 py-4"
					>
						{Array.from({ length: columns }).map((_, colIndex) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: Skeleton placeholder
							<Skeleton key={colIndex} className="h-4 flex-1" />
						))}
					</div>
				))}
			</div>

			{/* Pagination Skeleton */}
			{showPagination && (
				<div className="flex items-center justify-between p-4">
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-20" />
						<Skeleton className="h-4 w-32" />
					</div>
					<div className="flex items-center gap-1">
						<Skeleton className="h-8 w-8" />
						<Skeleton className="h-8 w-8" />
						<Skeleton className="h-8 w-8" />
						<Skeleton className="h-8 w-8" />
					</div>
				</div>
			)}
		</div>
	);
}

export { DataTableSkeleton };
export type { DataTableSkeletonProps };

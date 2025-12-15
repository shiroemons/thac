import { ChevronLeft, ChevronRight } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps extends React.ComponentProps<"div"> {
	page: number;
	pageSize: number;
	total: number;
	onPageChange: (page: number) => void;
	onPageSizeChange?: (pageSize: number) => void;
	pageSizeOptions?: number[];
}

function DataTablePagination({
	page,
	pageSize,
	total,
	onPageChange,
	onPageSizeChange,
	pageSizeOptions = [10, 20, 50, 100],
	className,
	...props
}: DataTablePaginationProps) {
	const totalPages = Math.ceil(total / pageSize);
	const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const endItem = Math.min(page * pageSize, total);

	// ページ番号の配列を生成
	const getPageNumbers = () => {
		const pages: (number | "ellipsis")[] = [];
		const maxVisiblePages = 5;

		if (totalPages <= maxVisiblePages) {
			// 全ページを表示
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			// 最初のページ
			pages.push(1);

			if (page > 3) {
				pages.push("ellipsis");
			}

			// 現在のページ周辺
			const start = Math.max(2, page - 1);
			const end = Math.min(totalPages - 1, page + 1);

			for (let i = start; i <= end; i++) {
				pages.push(i);
			}

			if (page < totalPages - 2) {
				pages.push("ellipsis");
			}

			// 最後のページ
			if (totalPages > 1) {
				pages.push(totalPages);
			}
		}

		return pages;
	};

	if (total === 0) {
		return null;
	}

	return (
		<div
			data-slot="data-table-pagination"
			className={cn(
				"mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row",
				className,
			)}
			{...props}
		>
			<div className="flex items-center gap-2 text-sm">
				{onPageSizeChange && (
					<>
						<Select
							size="sm"
							value={pageSize.toString()}
							onChange={(e) => onPageSizeChange(Number(e.target.value))}
							className="w-20"
						>
							{pageSizeOptions.map((size) => (
								<option key={size} value={size.toString()}>
									{size}
								</option>
							))}
						</Select>
						<span className="whitespace-nowrap text-base-content/70">
							件/ページ
						</span>
					</>
				)}
				<span className="whitespace-nowrap text-base-content/70">
					全{total}件中 {startItem}〜{endItem}件を表示
				</span>
			</div>

			<div className="flex items-center gap-1">
				<Button
					variant="ghost"
					size="sm"
					disabled={page === 1}
					onClick={() => onPageChange(page - 1)}
					aria-label="前のページ"
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>

				{getPageNumbers().map((pageNum, index) =>
					pageNum === "ellipsis" ? (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: Ellipsis pagination indicator
							key={`ellipsis-${index}`}
							className="px-2 text-base-content/50"
						>
							...
						</span>
					) : (
						<Button
							key={pageNum}
							variant={pageNum === page ? "primary" : "ghost"}
							size="sm"
							onClick={() => onPageChange(pageNum)}
							className="min-w-9"
						>
							{pageNum}
						</Button>
					),
				)}

				<Button
					variant="ghost"
					size="sm"
					disabled={page === totalPages}
					onClick={() => onPageChange(page + 1)}
					aria-label="次のページ"
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}

export { DataTablePagination };
export type { DataTablePaginationProps };

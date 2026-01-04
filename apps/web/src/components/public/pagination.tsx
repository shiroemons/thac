import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";

interface PaginationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	/** 表示するページ番号の最大数（デフォルト: 5） */
	maxVisiblePages?: number;
}

/**
 * ページネーションコンポーネント
 *
 * daisyUI の join + btn を使用したシンプルなページネーション。
 * 多くのページがある場合は省略記号（...）で表示。
 */
export function Pagination({
	currentPage,
	totalPages,
	onPageChange,
	maxVisiblePages = 5,
}: PaginationProps) {
	if (totalPages <= 1) return null;

	const handlePageChange = (page: number) => {
		if (page >= 1 && page <= totalPages && page !== currentPage) {
			onPageChange(page);
		}
	};

	// 表示するページ番号を計算
	const getVisiblePages = (): (number | "ellipsis")[] => {
		const pages: (number | "ellipsis")[] = [];

		if (totalPages <= maxVisiblePages) {
			// 全ページ表示可能
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			// 省略が必要
			const sidePages = Math.floor((maxVisiblePages - 3) / 2); // 両端と現在のページ以外

			// 常に最初のページを表示
			pages.push(1);

			// 開始位置を計算
			let start = Math.max(2, currentPage - sidePages);
			let end = Math.min(totalPages - 1, currentPage + sidePages);

			// 調整
			if (currentPage <= sidePages + 2) {
				end = Math.min(totalPages - 1, maxVisiblePages - 2);
			} else if (currentPage >= totalPages - sidePages - 1) {
				start = Math.max(2, totalPages - maxVisiblePages + 3);
			}

			// 左側の省略記号
			if (start > 2) {
				pages.push("ellipsis");
			}

			// 中間のページ
			for (let i = start; i <= end; i++) {
				pages.push(i);
			}

			// 右側の省略記号
			if (end < totalPages - 1) {
				pages.push("ellipsis");
			}

			// 常に最後のページを表示
			if (totalPages > 1) {
				pages.push(totalPages);
			}
		}

		return pages;
	};

	const visiblePages = getVisiblePages();

	return (
		<div className="flex items-center justify-center gap-2">
			{/* ページ情報 */}
			<span className="text-base-content/70 text-sm">
				{currentPage} / {totalPages} ページ
			</span>

			{/* ページネーションボタン */}
			<div className="join">
				{/* 最初のページへ */}
				<button
					type="button"
					className="btn btn-sm join-item"
					onClick={() => handlePageChange(1)}
					disabled={currentPage === 1}
					aria-label="最初のページへ"
				>
					<ChevronsLeft className="h-4 w-4" />
				</button>

				{/* 前のページへ */}
				<button
					type="button"
					className="btn btn-sm join-item"
					onClick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage === 1}
					aria-label="前のページへ"
				>
					<ChevronLeft className="h-4 w-4" />
				</button>

				{/* ページ番号 */}
				{visiblePages.map((page, idx) =>
					page === "ellipsis" ? (
						<span
							key={
								idx < visiblePages.length / 2
									? "ellipsis-start"
									: "ellipsis-end"
							}
							className="btn btn-sm join-item btn-disabled"
							aria-hidden="true"
						>
							...
						</span>
					) : (
						<button
							key={page}
							type="button"
							className={`btn btn-sm join-item ${
								currentPage === page ? "btn-primary" : ""
							}`}
							onClick={() => handlePageChange(page)}
							aria-current={currentPage === page ? "page" : undefined}
						>
							{page}
						</button>
					),
				)}

				{/* 次のページへ */}
				<button
					type="button"
					className="btn btn-sm join-item"
					onClick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
					aria-label="次のページへ"
				>
					<ChevronRight className="h-4 w-4" />
				</button>

				{/* 最後のページへ */}
				<button
					type="button"
					className="btn btn-sm join-item"
					onClick={() => handlePageChange(totalPages)}
					disabled={currentPage === totalPages}
					aria-label="最後のページへ"
				>
					<ChevronsRight className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}

// =============================================================================
// ページネーション用ユーティリティ
// =============================================================================

/** デフォルトのページサイズ */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * データをページネーションする
 */
export function paginateData<T>(
	data: T[],
	page: number,
	pageSize: number = DEFAULT_PAGE_SIZE,
): T[] {
	const start = (page - 1) * pageSize;
	return data.slice(start, start + pageSize);
}

/**
 * 総ページ数を計算する
 */
export function calculateTotalPages(
	totalItems: number,
	pageSize: number = DEFAULT_PAGE_SIZE,
): number {
	return Math.ceil(totalItems / pageSize);
}

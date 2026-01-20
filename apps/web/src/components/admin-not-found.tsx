import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileQuestion, LayoutDashboard, Search } from "lucide-react";

/**
 * 管理画面用404ページコンポーネント
 * 存在しないURLにアクセスした際に表示される
 */
export function AdminNotFound() {
	const handleGoBack = () => {
		window.history.back();
	};

	return (
		<div className="flex min-h-[400px] flex-col items-center justify-center p-8">
			<FileQuestion className="mb-4 h-16 w-16 text-warning" />
			<h1 className="mb-2 font-bold text-2xl">ページが見つかりませんでした</h1>
			<p className="mb-6 max-w-md text-center text-base-content/70">
				お探しのページは存在しないか、移動した可能性があります。
			</p>

			<div className="flex flex-wrap justify-center gap-3">
				<Link to="/admin" className="btn btn-primary gap-2">
					<LayoutDashboard className="size-4" aria-hidden="true" />
					ダッシュボードへ
				</Link>
				<Link to="/admin/search" className="btn btn-outline gap-2">
					<Search className="size-4" aria-hidden="true" />
					検索管理
				</Link>
			</div>

			<button
				type="button"
				onClick={handleGoBack}
				className="btn btn-ghost btn-sm mt-6 gap-2 text-base-content/60"
			>
				<ArrowLeft className="size-4" aria-hidden="true" />
				前のページに戻る
			</button>
		</div>
	);
}

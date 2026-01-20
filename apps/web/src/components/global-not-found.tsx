import { Link } from "@tanstack/react-router";
import { ArrowLeft, Home, Search } from "lucide-react";
import { PublicFooter, PublicHeader } from "./public";

/**
 * グローバル404ページコンポーネント
 * ルートレベルで存在しないURLにアクセスした際に表示される
 * 公開画面のヘッダー・フッターを含む
 */
export function GlobalNotFound() {
	const handleGoBack = () => {
		window.history.back();
	};

	return (
		<div className="flex min-h-screen flex-col">
			<PublicHeader />
			<main className="container mx-auto flex-1 px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
				<div className="relative flex min-h-[calc(100vh-16rem)] flex-col items-center justify-center px-4 py-12">
					{/* Gradient mesh background */}
					<div className="gradient-hero absolute inset-0" />

					{/* Floating decorative elements */}
					<div className="pointer-events-none absolute inset-0 overflow-hidden">
						<div className="absolute top-1/4 left-1/6 h-64 w-64 animate-pulse rounded-full bg-primary/10 blur-3xl" />
						<div className="animation-delay-1000 absolute right-1/6 bottom-1/4 h-48 w-48 animate-pulse rounded-full bg-secondary/10 blur-3xl" />
						<div className="animation-delay-2000 absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 animate-pulse rounded-full bg-accent/10 blur-2xl" />
					</div>

					<div className="glass-card relative max-w-md rounded-2xl p-8 text-center shadow-xl sm:p-12">
						{/* 404 with gradient text */}
						<h1 className="mb-4 font-bold text-8xl tracking-tight sm:text-9xl">
							<span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
								404
							</span>
						</h1>

						<h2 className="mb-3 font-semibold text-base-content text-xl sm:text-2xl">
							ページが見つかりませんでした
						</h2>

						<p className="mb-8 text-base-content/60">
							お探しのページは存在しないか、移動した可能性があります。
						</p>

						{/* Navigation buttons */}
						<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
							<Link to="/" preload="render" className="btn btn-primary gap-2">
								<Home className="size-4" aria-hidden="true" />
								ホームへ戻る
							</Link>
							<Link
								to="/search"
								preload="render"
								className="btn btn-outline gap-2"
							>
								<Search className="size-4" aria-hidden="true" />
								検索する
							</Link>
						</div>

						{/* Go back button */}
						<button
							type="button"
							onClick={handleGoBack}
							className="btn btn-ghost btn-sm mt-6 gap-2 text-base-content/60"
						>
							<ArrowLeft className="size-4" aria-hidden="true" />
							前のページに戻る
						</button>
					</div>
				</div>
			</main>
			<PublicFooter />
		</div>
	);
}

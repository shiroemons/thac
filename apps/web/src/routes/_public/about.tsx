import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Github, Music } from "lucide-react";
import { PublicBreadcrumb } from "@/components/public";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/_public/about")({
	head: () => createPageHead("About"),
	component: AboutPage,
});

function AboutPage() {
	return (
		<div className="space-y-8">
			<PublicBreadcrumb items={[{ label: "About" }]} />

			{/* ヘッダー */}
			<div className="text-center">
				<div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-primary/10">
					<Music className="size-10 text-primary" aria-hidden="true" />
				</div>
				<h1 className="font-bold text-3xl">東方編曲録</h1>
				<p className="mt-2 text-base-content/70 text-lg">
					Touhou Arrangement Chronicle
				</p>
			</div>

			{/* サイト概要 */}
			<section className="rounded-lg bg-base-100 p-6 shadow-sm">
				<h2 className="mb-4 font-bold text-xl">このサイトについて</h2>
				<div className="space-y-4 text-base-content/80">
					<p>
						東方編曲録は、東方Projectの二次創作音楽（アレンジ楽曲）を網羅的に収集・整理したデータベースサイトです。
					</p>
					<p>
						サークル、アーティスト、イベント、リリース作品など、東方アレンジに関するあらゆる情報を検索・閲覧できます。
					</p>
				</div>
			</section>

			{/* プロジェクトの目的 */}
			<section className="rounded-lg bg-base-100 p-6 shadow-sm">
				<h2 className="mb-4 font-bold text-xl">プロジェクトの目的</h2>
				<ul className="list-inside list-disc space-y-2 text-base-content/80">
					<li>東方アレンジ楽曲の包括的なデータベースの構築</li>
					<li>原曲とアレンジ楽曲の関連付けによる楽曲探索の支援</li>
					<li>サークル・アーティストの活動記録の保存</li>
					<li>即売会イベントとリリース作品の紐付け</li>
					<li>東方二次創作音楽文化の記録と継承</li>
				</ul>
			</section>

			{/* データについて */}
			<section className="rounded-lg bg-base-100 p-6 shadow-sm">
				<h2 className="mb-4 font-bold text-xl">収録データについて</h2>
				<div className="space-y-4 text-base-content/80">
					<p>
						本データベースには、コミックマーケット、博麗神社例大祭、紅楼夢などの即売会で頒布された作品を中心に、
						商業リリースやデジタル配信作品も収録しています。
					</p>
					<p>
						データは有志によって収集・整理されており、情報の正確性には最大限の注意を払っていますが、
						誤りや欠落がある可能性があります。お気づきの点がありましたらご連絡ください。
					</p>
				</div>
			</section>

			{/* 運営者情報 */}
			<section className="rounded-lg bg-base-100 p-6 shadow-sm">
				<h2 className="mb-4 font-bold text-xl">運営者情報</h2>
				<div className="space-y-4">
					<div className="flex items-center gap-4">
						<div className="flex size-12 items-center justify-center rounded-full bg-base-200">
							<span className="font-bold text-lg">S</span>
						</div>
						<div>
							<p className="font-medium">迷い家の白猫</p>
							<p className="text-base-content/70 text-sm">サイト運営・開発</p>
						</div>
					</div>
				</div>
			</section>

			{/* リンク */}
			<section className="rounded-lg bg-base-100 p-6 shadow-sm">
				<h2 className="mb-4 font-bold text-xl">リンク</h2>
				<div className="flex flex-wrap gap-4">
					<a
						href="https://github.com/shiroemons/thac"
						target="_blank"
						rel="noopener noreferrer"
						className="btn btn-outline gap-2"
					>
						<Github className="size-5" aria-hidden="true" />
						GitHub
						<ExternalLink className="size-4" aria-hidden="true" />
					</a>
				</div>
			</section>

			{/* 謝辞 */}
			<section className="rounded-lg bg-base-100 p-6 shadow-sm">
				<h2 className="mb-4 font-bold text-xl">謝辞</h2>
				<div className="space-y-4 text-base-content/80">
					<p>
						東方Projectの原作者であるZUN氏、および東方アレンジを制作されているすべてのサークル・アーティストの皆様に感謝いたします。
					</p>
					<p>
						また、データの収集・整理にご協力いただいている皆様にも心より感謝申し上げます。
					</p>
				</div>
			</section>

			{/* フッターリンク */}
			<div className="text-center">
				<Link to="/" className="btn btn-primary">
					トップページへ戻る
				</Link>
			</div>
		</div>
	);
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { PublicBreadcrumb } from "@/components/public";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/_public/privacy")({
	head: () => createPageHead("プライバシーポリシー"),
	component: PrivacyPage,
});

function PrivacyPage() {
	return (
		<div className="space-y-8">
			<PublicBreadcrumb items={[{ label: "プライバシーポリシー" }]} />

			{/* ヘッダー */}
			<div className="text-center">
				<div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-primary/10">
					<Shield className="size-10 text-primary" aria-hidden="true" />
				</div>
				<h1 className="font-bold text-3xl">プライバシーポリシー</h1>
				<p className="mt-2 text-base-content/70 text-lg">Privacy Policy</p>
			</div>

			{/* 基本方針 */}
			<section className="rounded-lg bg-base-100 p-6 shadow-sm">
				<h2 className="mb-4 font-bold text-xl">基本方針</h2>
				<div className="space-y-4 text-base-content/80">
					<p>
						東方編曲録（以下「当サイト」）は、利用者のプライバシーを尊重し、個人情報の保護に努めます。
						本プライバシーポリシーは、当サイトにおける個人情報の取り扱いについて説明するものです。
					</p>
				</div>
			</section>

			{/* 収集する情報 */}
			<section className="rounded-lg bg-base-100 p-6 shadow-sm">
				<h2 className="mb-4 font-bold text-xl">収集する情報</h2>
				<div className="space-y-4 text-base-content/80">
					<p>当サイトでは、以下の情報を収集する場合があります。</p>
					<ul className="list-inside list-disc space-y-2">
						<li>
							<strong>アカウント情報</strong>
							：ユーザー登録時に提供されるメールアドレス、パスワード（暗号化して保存）
						</li>
						<li>
							<strong>アクセスログ</strong>
							：IPアドレス、ブラウザ情報、アクセス日時などの技術的情報
						</li>
						<li>
							<strong>Cookie情報</strong>
							：セッション管理および利用体験の向上のために使用されるCookie
						</li>
					</ul>
				</div>
			</section>

			{/* 情報の利用目的 */}
			<section className="rounded-lg bg-base-100 p-6 shadow-sm">
				<h2 className="mb-4 font-bold text-xl">情報の利用目的</h2>
				<div className="space-y-4 text-base-content/80">
					<p>収集した情報は、以下の目的で利用します。</p>
					<ul className="list-inside list-disc space-y-2">
						<li>ユーザー認証およびアカウント管理</li>
						<li>サービスの提供および改善</li>
						<li>不正アクセスの防止およびセキュリティの確保</li>
						<li>お問い合わせへの対応</li>
						<li>サイトの利用状況の分析</li>
					</ul>
				</div>
			</section>

			{/* 情報の第三者提供 */}
			<section className="rounded-lg bg-base-100 p-6 shadow-sm">
				<h2 className="mb-4 font-bold text-xl">情報の第三者提供</h2>
				<div className="space-y-4 text-base-content/80">
					<p>
						当サイトは、法令に基づく場合を除き、利用者の同意なく個人情報を第三者に提供することはありません。
					</p>
					<p>ただし、以下の場合には個人情報を開示することがあります。</p>
					<ul className="list-inside list-disc space-y-2">
						<li>法令に基づく開示請求があった場合</li>
						<li>人の生命、身体または財産の保護のために必要な場合</li>
						<li>利用者本人の同意がある場合</li>
					</ul>
				</div>
			</section>

			{/* Cookieについて */}
			<section className="rounded-lg bg-base-100 p-6 shadow-sm">
				<h2 className="mb-4 font-bold text-xl">Cookieについて</h2>
				<div className="space-y-4 text-base-content/80">
					<p>
						当サイトでは、利用者の利便性向上およびサービス改善のためにCookieを使用しています。
					</p>
					<p>
						Cookieは、利用者のブラウザ設定により無効化することができますが、一部のサービスが正常に機能しなくなる可能性があります。
					</p>
				</div>
			</section>

			{/* セキュリティ */}
			<section className="rounded-lg bg-base-100 p-6 shadow-sm">
				<h2 className="mb-4 font-bold text-xl">セキュリティ</h2>
				<div className="space-y-4 text-base-content/80">
					<p>
						当サイトは、個人情報の漏洩、紛失、改ざんを防止するため、適切なセキュリティ対策を講じています。
					</p>
					<p>
						パスワードは暗号化して保存し、通信はHTTPSにより暗号化されています。
					</p>
				</div>
			</section>

			{/* プライバシーポリシーの変更 */}
			<section className="rounded-lg bg-base-100 p-6 shadow-sm">
				<h2 className="mb-4 font-bold text-xl">プライバシーポリシーの変更</h2>
				<div className="space-y-4 text-base-content/80">
					<p>
						当サイトは、必要に応じて本プライバシーポリシーを変更することがあります。
						重要な変更がある場合は、サイト上でお知らせします。
					</p>
				</div>
			</section>

			{/* お問い合わせ */}
			<section className="rounded-lg bg-base-100 p-6 shadow-sm">
				<h2 className="mb-4 font-bold text-xl">お問い合わせ</h2>
				<div className="space-y-4 text-base-content/80">
					<p>
						本プライバシーポリシーに関するお問い合わせは、
						<Link to="/about" className="link link-primary">
							Aboutページ
						</Link>
						に記載の連絡先までお願いいたします。
					</p>
				</div>
			</section>

			{/* 制定日 */}
			<section className="rounded-lg bg-base-100 p-6 shadow-sm">
				<div className="text-base-content/70 text-sm">
					<p>制定日: 2025年1月4日</p>
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

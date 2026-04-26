import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft, ExternalLink, Home } from "lucide-react";
import { useState } from "react";
import { AlbumRequestStatusBadge } from "@/components/admin/album-request-status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	ALBUM_REQUEST_STATUS_LABELS,
	ALBUM_REQUEST_TYPE_LABELS,
	type AlbumRequestStatus,
	isConflictError,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";
import { albumRequestMutations } from "@/lib/mutation-options";
import { albumRequestQueryOptions } from "@/lib/query-options";

export const Route = createFileRoute("/admin/_admin/album-requests_/$id")({
	head: () => createPageHead("アルバム申請詳細"),
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(albumRequestQueryOptions(params.id)),
	component: AlbumRequestDetailPage,
});

function AlbumRequestDetailPage() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();

	const [reviewerNotes, setReviewerNotes] = useState("");
	const [actionError, setActionError] = useState<string | null>(null);
	const [actionSuccess, setActionSuccess] = useState<string | null>(null);

	const { data: request } = useSuspenseQuery(albumRequestQueryOptions(id));

	const updateStatusMutation = useMutation(
		albumRequestMutations.updateStatus(queryClient),
	);

	const isPending_ = request.status === "pending";

	const handleAction = (status: "approved" | "rejected") => {
		setActionError(null);
		setActionSuccess(null);

		updateStatusMutation.mutate(
			{
				id,
				status,
				reviewerNotes: reviewerNotes || undefined,
				updatedAt: request.updatedAt,
			},
			{
				onSuccess: () => {
					const label = ALBUM_REQUEST_STATUS_LABELS[status];
					setActionSuccess(`申請を「${label}」に更新しました。`);
					setReviewerNotes("");
				},
				onError: (error) => {
					if (isConflictError(error)) {
						setActionError(
							"他の管理者が更新したため再読込が必要です。ページをリロードしてください。",
						);
					} else {
						setActionError(
							error instanceof Error ? error.message : "エラーが発生しました",
						);
					}
				},
			},
		);
	};

	const submittedAt = format(
		new Date(request.createdAt),
		"yyyy/MM/dd HH:mm:ss",
		{
			locale: ja,
		},
	);
	const reviewedAt = request.reviewedAt
		? format(new Date(request.reviewedAt), "yyyy/MM/dd HH:mm:ss", {
				locale: ja,
			})
		: null;

	return (
		<div className="container mx-auto space-y-6 p-6">
			{/* パンくず */}
			<nav className="breadcrumbs text-sm">
				<ul>
					<li>
						<Link to="/admin">
							<Home className="h-4 w-4" />
						</Link>
					</li>
					<li>
						<Link to="/admin/album-requests">アルバム申請</Link>
					</li>
					<li>詳細</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<div className="flex items-center gap-4">
				<Link to="/admin/album-requests" className="btn btn-ghost btn-sm">
					<ArrowLeft className="h-4 w-4" />
				</Link>
				<h1 className="font-bold text-2xl">アルバム申請詳細</h1>
			</div>

			{/* 成功/エラーバナー */}
			{actionSuccess && (
				<div className="rounded-lg bg-success p-4 text-sm text-success-content">
					{actionSuccess}
				</div>
			)}
			{actionError && (
				<div className="rounded-lg bg-error p-4 text-error-content text-sm">
					{actionError}
				</div>
			)}

			<div className="grid gap-6 lg:grid-cols-3">
				{/* メインコンテンツ */}
				<div className="space-y-6 lg:col-span-2">
					{/* 基本情報 */}
					<div className="rounded-lg border border-base-300 bg-base-100 p-6">
						<h2 className="mb-4 font-semibold text-lg">基本情報</h2>
						<dl className="grid gap-4">
							<div className="grid grid-cols-[140px_1fr] gap-2">
								<dt className="text-base-content/70 text-sm">ステータス</dt>
								<dd>
									<AlbumRequestStatusBadge
										status={request.status as AlbumRequestStatus}
									/>
								</dd>
							</div>
							<div className="grid grid-cols-[140px_1fr] gap-2">
								<dt className="text-base-content/70 text-sm">
									リクエストタイプ
								</dt>
								<dd className="text-sm">
									{ALBUM_REQUEST_TYPE_LABELS[
										request.requestType as keyof typeof ALBUM_REQUEST_TYPE_LABELS
									] ?? request.requestType}
								</dd>
							</div>
							{request.albumName && (
								<div className="grid grid-cols-[140px_1fr] gap-2">
									<dt className="text-base-content/70 text-sm">アルバム名</dt>
									<dd className="text-sm">{request.albumName}</dd>
								</div>
							)}
							{request.circleName && (
								<div className="grid grid-cols-[140px_1fr] gap-2">
									<dt className="text-base-content/70 text-sm">サークル名</dt>
									<dd className="text-sm">{request.circleName}</dd>
								</div>
							)}
							{request.notes && (
								<div className="grid grid-cols-[140px_1fr] gap-2">
									<dt className="text-base-content/70 text-sm">補足</dt>
									<dd className="whitespace-pre-wrap text-sm">
										{request.notes}
									</dd>
								</div>
							)}
						</dl>
					</div>

					{/* 既存作品への追記の場合 */}
					{request.requestType === "existing" &&
						request.existingRelease?.id && (
							<div className="rounded-lg border border-base-300 bg-base-100 p-6">
								<h2 className="mb-4 font-semibold text-lg">対象作品</h2>
								<div className="flex items-center gap-2">
									<span className="text-sm">
										{request.existingRelease.name}
										{request.existingRelease.nameJa &&
											request.existingRelease.nameJa !==
												request.existingRelease.name && (
												<span className="ml-2 text-base-content/60">
													({request.existingRelease.nameJa})
												</span>
											)}
									</span>
									<a
										href={`/admin/releases/${request.existingRelease.id}`}
										target="_blank"
										rel="noreferrer"
										className="btn btn-ghost btn-xs"
									>
										<ExternalLink className="h-3 w-3" />
										<span>管理画面で開く</span>
									</a>
								</div>
								{request.existingRelease.releaseDate && (
									<p className="mt-2 text-base-content/60 text-sm">
										頒布日: {request.existingRelease.releaseDate}
									</p>
								)}
							</div>
						)}

					{/* 参考URL */}
					{request.referenceUrls.length > 0 && (
						<div className="rounded-lg border border-base-300 bg-base-100 p-6">
							<h2 className="mb-4 font-semibold text-lg">参考URL</h2>
							<ul className="space-y-2">
								{request.referenceUrls.map((ref, index) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: 参考URLは順序付きリストでインデックスが適切
									<li key={`${ref.url}-${index}`} className="text-sm">
										<a
											href={ref.url}
											target="_blank"
											rel="noreferrer"
											className="inline-flex items-center gap-1 text-primary hover:underline"
										>
											<ExternalLink className="h-3 w-3 shrink-0" />
											{ref.label || ref.url}
										</a>
										{ref.label && (
											<span className="ml-2 text-base-content/50 text-xs">
												{ref.url}
											</span>
										)}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				{/* サイドバー */}
				<div className="space-y-6">
					{/* 提出者情報 */}
					<div className="rounded-lg border border-base-300 bg-base-100 p-6">
						<h2 className="mb-4 font-semibold text-lg">提出者</h2>
						<dl className="space-y-2">
							<div>
								<dt className="text-base-content/70 text-xs">名前</dt>
								<dd className="text-sm">{request.submittedBy?.name ?? "-"}</dd>
							</div>
							<div>
								<dt className="text-base-content/70 text-xs">メール</dt>
								<dd className="text-sm">{request.submittedBy?.email ?? "-"}</dd>
							</div>
							<div>
								<dt className="text-base-content/70 text-xs">提出日時</dt>
								<dd className="text-sm">{submittedAt}</dd>
							</div>
						</dl>
					</div>

					{/* レビュー履歴（pending 以外のとき） */}
					{request.status !== "pending" && (
						<div className="rounded-lg border border-base-300 bg-base-100 p-6">
							<h2 className="mb-4 font-semibold text-lg">レビュー履歴</h2>
							<dl className="space-y-2">
								<div>
									<dt className="text-base-content/70 text-xs">レビュアー</dt>
									<dd className="text-sm">{request.reviewer?.name ?? "-"}</dd>
								</div>
								<div>
									<dt className="text-base-content/70 text-xs">レビュー日時</dt>
									<dd className="text-sm">{reviewedAt ?? "-"}</dd>
								</div>
								{request.reviewerNotes && (
									<div>
										<dt className="text-base-content/70 text-xs">
											レビューメモ
										</dt>
										<dd className="mt-1 whitespace-pre-wrap rounded-md bg-base-200 p-3 text-sm">
											{request.reviewerNotes}
										</dd>
									</div>
								)}
							</dl>
						</div>
					)}

					{/* アクション（pending のみ） */}
					{isPending_ && (
						<div className="rounded-lg border border-base-300 bg-base-100 p-6">
							<h2 className="mb-4 font-semibold text-lg">審査</h2>
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="reviewer-notes">レビューメモ（任意）</Label>
									<Textarea
										id="reviewer-notes"
										value={reviewerNotes}
										onChange={(e) => setReviewerNotes(e.target.value)}
										rows={4}
										placeholder="承認・却下の理由など"
										autoComplete="off"
										data-1p-ignore
										data-lpignore="true"
										data-form-type="other"
									/>
								</div>
								<div className="flex gap-2">
									<Button
										variant="primary"
										className="flex-1"
										onClick={() => handleAction("approved")}
										disabled={updateStatusMutation.isPending}
									>
										{updateStatusMutation.isPending ? "処理中..." : "承認"}
									</Button>
									<Button
										variant="destructive"
										className="flex-1"
										onClick={() => handleAction("rejected")}
										disabled={updateStatusMutation.isPending}
									>
										{updateStatusMutation.isPending ? "処理中..." : "却下"}
									</Button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { AlbumRequestStatusBadge } from "@/components/admin/album-request-status-badge";
import { PublicHeader } from "@/components/public/public-header";
import { getUser } from "@/functions/get-user";
import type {
	AlbumRequestForUser,
	AlbumRequestStatus,
	AlbumRequestType,
} from "@/lib/api-client";
import { ALBUM_REQUEST_TYPE_LABELS } from "@/lib/api-client";
import { CACHE_HEADERS } from "@/lib/cache-headers";
import { createPageHead } from "@/lib/head";
import { userAlbumRequestsQueryOptions } from "@/lib/query-options";

export const Route = createFileRoute("/user/album-requests")({
	head: () => createPageHead("提供リクエスト一覧"),
	headers: () => CACHE_HEADERS.PRIVATE,
	beforeLoad: async () => {
		const session = await getUser();

		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: { returnTo: "/user/album-requests" },
			});
		}

		return { user: session.user };
	},
	component: AlbumRequestsPage,
});

function AlbumRequestsPage() {
	const { data } = useSuspenseQuery(userAlbumRequestsQueryOptions);

	return (
		<div className="flex min-h-screen flex-col">
			<PublicHeader />
			<main className="flex-1 bg-base-200/30">
				<div className="mx-auto max-w-3xl px-4 py-8">
					<div className="mb-6 flex items-center justify-between">
						<h1 className="font-bold text-2xl">あなたの提供リクエスト</h1>
						<Link
							to="/user/album-requests/new"
							className="btn btn-primary btn-sm"
						>
							新しいリクエストを作成
						</Link>
					</div>

					{data.items.length === 0 ? (
						<div className="rounded-box bg-base-100 p-12 text-center shadow">
							<p className="text-base-content/60">まだリクエストはありません</p>
							<Link
								to="/user/album-requests/new"
								className="btn btn-primary mt-4"
							>
								最初のリクエストを作成する
							</Link>
						</div>
					) : (
						<ul className="space-y-4">
							{data.items.map((item) => (
								<li key={item.id}>
									<AlbumRequestCard item={item} />
								</li>
							))}
						</ul>
					)}
				</div>
			</main>
			<footer className="bg-base-200 py-6 text-center text-base-content/60 text-sm">
				<p>
					&copy; {new Date().getFullYear()} 迷い家の白猫. All rights reserved.
				</p>
			</footer>
		</div>
	);
}

interface AlbumRequestCardProps {
	item: AlbumRequestForUser;
}

function AlbumRequestCard({ item }: AlbumRequestCardProps) {
	const formattedDate = new Intl.DateTimeFormat("ja-JP", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date(item.createdAt));

	const requestTypeLabel =
		ALBUM_REQUEST_TYPE_LABELS[item.requestType as AlbumRequestType] ??
		item.requestType;

	return (
		<div className="rounded-box bg-base-100 p-5 shadow">
			<div className="mb-3 flex flex-wrap items-center gap-2">
				<AlbumRequestStatusBadge status={item.status as AlbumRequestStatus} />
				<span className="text-base-content/60 text-sm">
					{formattedDate} 提出
				</span>
			</div>

			<div className="mb-2">
				<span className="badge badge-outline badge-sm mr-2">
					{requestTypeLabel}
				</span>
				{item.requestType === "existing" && item.existingRelease?.id ? (
					<span className="font-medium">
						{item.existingRelease.nameJa ||
							item.existingRelease.name ||
							"(既存アルバム)"}
					</span>
				) : (
					<span className="font-medium">
						{item.albumName ?? "(アルバム名未設定)"}
					</span>
				)}
			</div>

			{item.circleName && (
				<p className="mb-2 text-base-content/70 text-sm">
					サークル: {item.circleName}
				</p>
			)}

			{item.referenceUrls.length > 0 && (
				<div className="mb-2">
					<p className="mb-1 font-medium text-base-content/60 text-xs">
						参考URL
					</p>
					<ul className="space-y-0.5">
						{item.referenceUrls.map((ref) => (
							<li key={ref.url}>
								<a
									href={ref.url}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-primary text-sm hover:underline"
								>
									<ExternalLink className="h-3 w-3 shrink-0" />
									{ref.label || ref.url}
								</a>
							</li>
						))}
					</ul>
				</div>
			)}

			{item.notes && (
				<p className="mb-2 text-base-content/70 text-sm">
					<span className="font-medium">補足: </span>
					{item.notes}
				</p>
			)}

			{item.reviewerNotes && (
				<div className="mt-3 rounded-field border border-base-300 bg-base-200 p-3">
					<p className="mb-1 font-medium text-base-content/60 text-xs">
						管理者コメント
					</p>
					<p className="text-sm">{item.reviewerNotes}</p>
				</div>
			)}
		</div>
	);
}

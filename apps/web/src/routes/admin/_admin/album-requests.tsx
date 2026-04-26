import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Home } from "lucide-react";
import { useState } from "react";
import { AlbumRequestStatusBadge } from "@/components/admin/album-request-status-badge";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	ALBUM_REQUEST_STATUS_LABELS,
	ALBUM_REQUEST_TYPE_LABELS,
	type AlbumRequestStatus,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";
import { albumRequestsListQueryOptions } from "@/lib/query-options";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export const Route = createFileRoute("/admin/_admin/album-requests")({
	head: () => createPageHead("アルバム申請"),
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(
			albumRequestsListQueryOptions({
				page: DEFAULT_PAGE,
				limit: DEFAULT_PAGE_SIZE,
			}),
		),
	component: AlbumRequestsPage,
});

type StatusTab = AlbumRequestStatus | "all";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
	{ value: "all", label: "すべて" },
	{ value: "pending", label: ALBUM_REQUEST_STATUS_LABELS.pending },
	{ value: "approved", label: ALBUM_REQUEST_STATUS_LABELS.approved },
	{ value: "rejected", label: ALBUM_REQUEST_STATUS_LABELS.rejected },
];

function AlbumRequestsPage() {
	const [page, setPage] = useState(DEFAULT_PAGE);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [activeTab, setActiveTab] = useState<StatusTab>("all");
	const navigate = useNavigate();

	const statusParam = activeTab === "all" ? undefined : activeTab;

	const { data, isPending, error } = useQuery(
		albumRequestsListQueryOptions({
			status: statusParam,
			page,
			limit: pageSize,
		}),
	);

	const requests = data?.data ?? [];
	const total = data?.total ?? 0;

	const handleTabChange = (tab: StatusTab) => {
		setActiveTab(tab);
		setPage(1);
	};

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
	};

	const handlePageSizeChange = (newPageSize: number) => {
		setPageSize(newPageSize);
		setPage(1);
	};

	return (
		<div className="container mx-auto space-y-6 p-6">
			<nav className="breadcrumbs text-sm">
				<ul>
					<li>
						<Link to="/admin">
							<Home className="h-4 w-4" />
						</Link>
					</li>
					<li>アルバム申請</li>
				</ul>
			</nav>

			<h1 className="font-bold text-2xl">アルバム申請</h1>

			{/* ステータスタブ */}
			<div role="tablist" className="tabs tabs-box">
				{STATUS_TABS.map((tab) => (
					<button
						key={tab.value}
						type="button"
						role="tab"
						className={activeTab === tab.value ? "tab tab-active" : "tab"}
						onClick={() => handleTabChange(tab.value)}
					>
						{tab.label}
					</button>
				))}
			</div>

			<div className="rounded-lg border border-base-300 bg-base-100">
				{error && (
					<div className="border-base-300 border-b bg-error p-4 text-error-content text-sm">
						{error instanceof Error ? error.message : "エラーが発生しました"}
					</div>
				)}

				{isPending && !data ? (
					<DataTableSkeleton
						rows={5}
						columns={6}
						showActionBar={false}
						showPagination={false}
					/>
				) : (
					<>
						<Table zebra>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="w-[120px]">ステータス</TableHead>
									<TableHead className="w-[120px]">タイプ</TableHead>
									<TableHead className="min-w-[200px]">
										アルバム名 / 対象作品
									</TableHead>
									<TableHead className="min-w-[150px]">サークル名</TableHead>
									<TableHead className="min-w-[150px]">提出者</TableHead>
									<TableHead className="w-[160px]">提出日時</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{requests.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={6}
											className="h-24 text-center text-base-content/50"
										>
											該当するアルバム申請が見つかりません
										</TableCell>
									</TableRow>
								) : (
									requests.map((request) => (
										<TableRow
											key={request.id}
											className="cursor-pointer hover:bg-base-200"
											onClick={() =>
												navigate({
													to: "/admin/album-requests/$id",
													params: { id: request.id },
												})
											}
										>
											<TableCell>
												<AlbumRequestStatusBadge
													status={request.status as AlbumRequestStatus}
												/>
											</TableCell>
											<TableCell className="text-base-content/70">
												{ALBUM_REQUEST_TYPE_LABELS[
													request.requestType as keyof typeof ALBUM_REQUEST_TYPE_LABELS
												] ?? request.requestType}
											</TableCell>
											<TableCell className="font-medium">
												{request.requestType === "existing"
													? (request.existingRelease?.name ?? "-")
													: (request.albumName ?? "-")}
											</TableCell>
											<TableCell className="text-base-content/70">
												{request.circleName ?? "-"}
											</TableCell>
											<TableCell className="text-base-content/70">
												{request.submittedBy?.name ?? "-"}
											</TableCell>
											<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
												{format(
													new Date(request.createdAt),
													"yyyy/MM/dd HH:mm",
													{ locale: ja },
												)}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>

						<div className="border-base-300 border-t p-4">
							<DataTablePagination
								page={page}
								pageSize={pageSize}
								total={total}
								onPageChange={handlePageChange}
								onPageSizeChange={handlePageSizeChange}
							/>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

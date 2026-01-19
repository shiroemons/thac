import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	CheckCircle,
	Database,
	Home,
	Loader2,
	RefreshCw,
	Search,
	Server,
	XCircle,
} from "lucide-react";
import { useCallback, useState } from "react";
import {
	type IndexStatus,
	type ReindexProgress,
	searchApi,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/search")({
	head: () => createPageHead("検索管理"),
	component: SearchManagementPage,
});

type ReindexPhase = ReindexProgress["phase"];

const PHASE_LABELS: Record<ReindexPhase, string> = {
	fetching: "データ取得中",
	transforming: "データ変換中",
	indexing: "インデックス作成中",
	completed: "完了",
	error: "エラー",
};

function SearchManagementPage() {
	const queryClient = useQueryClient();
	const [reindexingTarget, setReindexingTarget] = useState<string | null>(null);
	const [reindexProgress, setReindexProgress] =
		useState<ReindexProgress | null>(null);

	// Health check query
	const healthQuery = useQuery({
		queryKey: ["search-health"],
		queryFn: searchApi.health,
		staleTime: 30_000,
		refetchInterval: 60_000,
	});

	// Status query
	const statusQuery = useQuery({
		queryKey: ["search-status"],
		queryFn: searchApi.status,
		staleTime: 30_000,
		refetchInterval: 60_000,
	});

	// Progress callback
	const handleProgress = useCallback((progress: ReindexProgress) => {
		setReindexProgress(progress);
	}, []);

	// Reindex all mutation
	const reindexAllMutation = useMutation({
		mutationFn: () => searchApi.reindexWithProgress(handleProgress),
		onMutate: () => {
			setReindexingTarget("all");
			setReindexProgress(null);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["search-status"] });
		},
		onSettled: () => {
			setTimeout(() => {
				setReindexingTarget(null);
				setReindexProgress(null);
			}, 2000);
		},
	});

	// Reindex single index mutation
	const reindexIndexMutation = useMutation({
		mutationFn: (indexName: string) =>
			searchApi.reindexIndexWithProgress(indexName, handleProgress),
		onMutate: (indexName) => {
			setReindexingTarget(indexName);
			setReindexProgress(null);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["search-status"] });
		},
		onSettled: () => {
			setTimeout(() => {
				setReindexingTarget(null);
				setReindexProgress(null);
			}, 2000);
		},
	});

	const isReindexing = reindexingTarget !== null;
	const isHealthy = healthQuery.data?.success && healthQuery.data?.status;

	return (
		<div className="container mx-auto space-y-6 p-6">
			{/* Breadcrumb navigation */}
			<nav className="breadcrumbs text-sm">
				<ul>
					<li>
						<Link to="/admin">
							<Home className="h-4 w-4" />
						</Link>
					</li>
					<li>検索管理</li>
				</ul>
			</nav>

			{/* Header */}
			<div className="flex items-center gap-3">
				<Search className="h-6 w-6 text-primary" />
				<h1 className="font-bold text-2xl">検索管理</h1>
			</div>
			<p className="text-base-content/70">
				Meilisearch検索エンジンの状態管理とインデックスの再構築を行います
			</p>

			{/* Health Status Card */}
			<div className="card border border-base-300 bg-base-100">
				<div className="card-body">
					<h2 className="card-title flex items-center gap-2">
						<Server className="h-5 w-5" />
						接続状態
					</h2>

					{healthQuery.isPending ? (
						<div className="flex items-center gap-2">
							<Loader2 className="h-4 w-4 animate-spin" />
							<span>接続確認中...</span>
						</div>
					) : healthQuery.isError ? (
						<div className="alert alert-error">
							<XCircle className="h-4 w-4" />
							<span>
								接続に失敗しました:{" "}
								{healthQuery.error instanceof Error
									? healthQuery.error.message
									: "Unknown error"}
							</span>
						</div>
					) : (
						<div className="flex flex-wrap items-center gap-4">
							<div className="flex items-center gap-2">
								{isHealthy ? (
									<>
										<CheckCircle className="h-5 w-5 text-success" />
										<span className="badge badge-success badge-lg">接続中</span>
									</>
								) : (
									<>
										<XCircle className="h-5 w-5 text-error" />
										<span className="badge badge-error badge-lg">
											接続エラー
										</span>
									</>
								)}
							</div>
							{healthQuery.data?.version && (
								<div className="text-base-content/70 text-sm">
									Meilisearch バージョン: {healthQuery.data.version}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Reindex All Button */}
			<div className="flex justify-end">
				<button
					type="button"
					className="btn btn-primary"
					onClick={() => reindexAllMutation.mutate()}
					disabled={isReindexing || !isHealthy}
				>
					{reindexingTarget === "all" ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" />
							再インデックス中...
						</>
					) : (
						<>
							<RefreshCw className="h-4 w-4" />
							全インデックスを再構築
						</>
					)}
				</button>
			</div>

			{/* Progress Section */}
			{isReindexing && reindexProgress && (
				<div className="card border border-primary bg-primary/5">
					<div className="card-body">
						<h3 className="card-title text-lg">
							再インデックス中: {reindexProgress.index}
						</h3>
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="flex items-center gap-2">
									{reindexProgress.phase === "completed" ? (
										<CheckCircle className="h-4 w-4 text-success" />
									) : reindexProgress.phase === "error" ? (
										<XCircle className="h-4 w-4 text-error" />
									) : (
										<Loader2 className="h-4 w-4 animate-spin text-primary" />
									)}
									<span>{PHASE_LABELS[reindexProgress.phase]}</span>
								</span>
								<span className="font-medium">
									{reindexProgress.current} / {reindexProgress.total}
								</span>
							</div>
							<progress
								className={`progress w-full ${
									reindexProgress.phase === "completed"
										? "progress-success"
										: reindexProgress.phase === "error"
											? "progress-error"
											: "progress-primary"
								}`}
								value={reindexProgress.current}
								max={reindexProgress.total || 100}
							/>
							<p className="text-base-content/70 text-sm">
								{reindexProgress.message}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Error display */}
			{(reindexAllMutation.isError || reindexIndexMutation.isError) && (
				<div className="alert alert-error">
					<AlertCircle className="h-4 w-4" />
					<span>
						再インデックスに失敗しました:{" "}
						{reindexAllMutation.error instanceof Error
							? reindexAllMutation.error.message
							: reindexIndexMutation.error instanceof Error
								? reindexIndexMutation.error.message
								: "Unknown error"}
					</span>
				</div>
			)}

			{/* Index List */}
			<div className="card border border-base-300 bg-base-100">
				<div className="card-body">
					<h2 className="card-title flex items-center gap-2">
						<Database className="h-5 w-5" />
						インデックス一覧
					</h2>

					{statusQuery.isPending ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-8 w-8 animate-spin text-primary" />
						</div>
					) : statusQuery.isError ? (
						<div className="alert alert-error">
							<XCircle className="h-4 w-4" />
							<span>
								ステータス取得に失敗しました:{" "}
								{statusQuery.error instanceof Error
									? statusQuery.error.message
									: "Unknown error"}
							</span>
						</div>
					) : statusQuery.data?.indexes &&
						statusQuery.data.indexes.length > 0 ? (
						<div className="overflow-x-auto">
							<table className="table">
								<thead>
									<tr>
										<th>インデックス名</th>
										<th className="text-right">ドキュメント数</th>
										<th>最終更新</th>
										<th>状態</th>
										<th className="text-right">操作</th>
									</tr>
								</thead>
								<tbody>
									{statusQuery.data.indexes.map((index) => (
										<IndexRow
											key={index.name}
											index={index}
											isReindexing={reindexingTarget === index.name}
											isDisabled={isReindexing || !isHealthy}
											onReindex={() => reindexIndexMutation.mutate(index.name)}
										/>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<div className="py-8 text-center text-base-content/50">
							<Database className="mx-auto h-12 w-12 opacity-50" />
							<p className="mt-2">インデックスがありません</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

interface IndexRowProps {
	index: IndexStatus;
	isReindexing: boolean;
	isDisabled: boolean;
	onReindex: () => void;
}

function IndexRow({
	index,
	isReindexing,
	isDisabled,
	onReindex,
}: IndexRowProps) {
	const formatDate = (dateStr: string | null) => {
		if (!dateStr) return "-";
		try {
			const date = new Date(dateStr);
			return date.toLocaleString("ja-JP", {
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return dateStr;
		}
	};

	return (
		<tr>
			<td>
				<div className="flex items-center gap-2">
					<Database className="h-4 w-4 text-base-content/50" />
					<span className="font-medium">{index.name}</span>
				</div>
			</td>
			<td className="text-right font-mono">
				{index.numberOfDocuments.toLocaleString()}
			</td>
			<td className="text-base-content/70 text-sm">
				{formatDate(index.lastUpdate)}
			</td>
			<td>
				{index.isIndexing ? (
					<span className="badge badge-warning badge-sm gap-1">
						<Loader2 className="h-3 w-3 animate-spin" />
						処理中
					</span>
				) : (
					<span className="badge badge-success badge-sm">正常</span>
				)}
			</td>
			<td className="text-right">
				<button
					type="button"
					className="btn btn-ghost btn-sm"
					onClick={onReindex}
					disabled={isDisabled}
				>
					{isReindexing ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<RefreshCw className="h-4 w-4" />
					)}
					<span className="hidden sm:inline">再構築</span>
				</button>
			</td>
		</tr>
	);
}

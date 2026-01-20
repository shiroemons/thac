import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	CheckCircle,
	Database,
	Home,
	Loader2,
	RefreshCw,
	Save,
	Search,
	Server,
	Settings,
	XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
	const [settingsModalIndex, setSettingsModalIndex] = useState<string | null>(
		null,
	);

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
											onOpenSettings={() => setSettingsModalIndex(index.name)}
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

			{/* Settings Modal */}
			{settingsModalIndex && (
				<IndexSettingsModal
					indexName={settingsModalIndex}
					isOpen={true}
					onClose={() => setSettingsModalIndex(null)}
				/>
			)}
		</div>
	);
}

// ===== Settings Modal Component =====

interface IndexSettingsModalProps {
	indexName: string;
	isOpen: boolean;
	onClose: () => void;
}

function IndexSettingsModal({
	indexName,
	isOpen,
	onClose,
}: IndexSettingsModalProps) {
	const queryClient = useQueryClient();

	// Local state for editing
	const [searchableAttrs, setSearchableAttrs] = useState<string[]>([]);
	const [filterableAttrs, setFilterableAttrs] = useState<string[]>([]);
	const [sortableAttrs, setSortableAttrs] = useState<string[]>([]);
	const [hasChanges, setHasChanges] = useState(false);

	// Fetch current settings
	const { data, isPending, error, refetch } = useQuery({
		queryKey: ["search-settings", indexName],
		queryFn: () => searchApi.getSettings(indexName),
		enabled: isOpen,
	});

	// Initialize form state from fetched data
	useEffect(() => {
		if (data?.settings) {
			setSearchableAttrs(data.settings.searchableAttributes || []);
			setFilterableAttrs(data.settings.filterableAttributes || []);
			setSortableAttrs(data.settings.sortableAttributes || []);
			setHasChanges(false);
		}
	}, [data]);

	// Update mutation
	const updateMutation = useMutation({
		mutationFn: () =>
			searchApi.updateSettings(indexName, {
				searchableAttributes: searchableAttrs,
				filterableAttributes: filterableAttrs,
				sortableAttributes: sortableAttrs,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["search-settings", indexName],
			});
			setHasChanges(false);
		},
	});

	// Reset mutation
	const resetMutation = useMutation({
		mutationFn: () => searchApi.resetSettings(indexName),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["search-settings", indexName],
			});
			refetch();
		},
	});

	// Handle attribute changes
	const handleArrayChange = useCallback(
		(setter: React.Dispatch<React.SetStateAction<string[]>>) =>
			(value: string) => {
				const attrs = value
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean);
				setter(attrs);
				setHasChanges(true);
			},
		[],
	);

	return (
		<dialog className="modal" open={isOpen}>
			<div className="modal-box w-11/12 max-w-3xl">
				<h3 className="flex items-center gap-2 font-bold text-lg">
					<Settings className="h-5 w-5" />
					{indexName} インデックス設定
				</h3>

				{/* Loading state */}
				{isPending && (
					<div className="flex justify-center py-8">
						<Loader2 className="h-8 w-8 animate-spin" />
					</div>
				)}

				{/* Error state */}
				{(error || (data && !data.success)) && (
					<div className="alert alert-error mt-4">
						<AlertCircle className="h-4 w-4" />
						<span>
							{error?.message || data?.error || "設定の取得に失敗しました"}
						</span>
					</div>
				)}

				{/* Success/Error alerts for mutations */}
				{updateMutation.isSuccess && (
					<div className="alert alert-success mt-4">
						<CheckCircle className="h-4 w-4" />
						<span>設定を更新しました</span>
					</div>
				)}
				{updateMutation.error && (
					<div className="alert alert-error mt-4">
						<AlertCircle className="h-4 w-4" />
						<span>{updateMutation.error.message}</span>
					</div>
				)}

				{/* Settings Form */}
				{data?.success && data.settings && (
					<div className="mt-4 space-y-4">
						{/* Searchable Attributes */}
						<div className="card border border-base-300 bg-base-100">
							<div className="card-body p-4">
								<div className="flex items-center gap-2">
									<h4 className="font-semibold text-sm">検索対象属性</h4>
									<span className="badge badge-outline badge-xs">
										Searchable Attributes
									</span>
								</div>
								<p className="text-base-content/70 text-xs">
									キーワード検索時に対象となるフィールドを指定します。ユーザーが検索したキーワードは、ここで指定された属性から検索されます。
								</p>
								{searchableAttrs.length > 0 && (
									<div className="flex flex-wrap gap-1">
										{searchableAttrs.map((attr) => (
											<span key={attr} className="badge badge-primary badge-sm">
												{attr}
											</span>
										))}
									</div>
								)}
								<input
									type="text"
									className="input input-bordered input-sm w-full"
									value={searchableAttrs.join(", ")}
									onChange={(e) =>
										handleArrayChange(setSearchableAttrs)(e.target.value)
									}
									placeholder="name, nameJa, nameEn, ..."
								/>
							</div>
						</div>

						{/* Filterable Attributes */}
						<div className="card border border-base-300 bg-base-100">
							<div className="card-body p-4">
								<div className="flex items-center gap-2">
									<h4 className="font-semibold text-sm">フィルター属性</h4>
									<span className="badge badge-outline badge-xs">
										Filterable Attributes
									</span>
								</div>
								<p className="text-base-content/70 text-xs">
									検索結果を絞り込むためのフィルターとして使用可能なフィールドを指定します。例:「2024年のみ」「特定イベントのみ」など。
								</p>
								{filterableAttrs.length > 0 && (
									<div className="flex flex-wrap gap-1">
										{filterableAttrs.map((attr) => (
											<span
												key={attr}
												className="badge badge-secondary badge-sm"
											>
												{attr}
											</span>
										))}
									</div>
								)}
								<input
									type="text"
									className="input input-bordered input-sm w-full"
									value={filterableAttrs.join(", ")}
									onChange={(e) =>
										handleArrayChange(setFilterableAttrs)(e.target.value)
									}
									placeholder="releaseYear, eventName, ..."
								/>
							</div>
						</div>

						{/* Sortable Attributes */}
						<div className="card border border-base-300 bg-base-100">
							<div className="card-body p-4">
								<div className="flex items-center gap-2">
									<h4 className="font-semibold text-sm">ソート属性</h4>
									<span className="badge badge-outline badge-xs">
										Sortable Attributes
									</span>
								</div>
								<p className="text-base-content/70 text-xs">
									検索結果の並び替えに使用可能なフィールドを指定します。例:「新しい順」「名前順」など。
								</p>
								{sortableAttrs.length > 0 && (
									<div className="flex flex-wrap gap-1">
										{sortableAttrs.map((attr) => (
											<span key={attr} className="badge badge-accent badge-sm">
												{attr}
											</span>
										))}
									</div>
								)}
								<input
									type="text"
									className="input input-bordered input-sm w-full"
									value={sortableAttrs.join(", ")}
									onChange={(e) =>
										handleArrayChange(setSortableAttrs)(e.target.value)
									}
									placeholder="releaseDate, name, ..."
								/>
							</div>
						</div>

						{/* Read-only settings */}
						<div className="card border border-base-300 bg-base-100">
							<div className="card-body p-4">
								<h4 className="font-semibold text-sm">
									その他の設定（読み取り専用）
								</h4>
								<p className="text-base-content/70 text-xs">
									これらの設定はコードで定義されており、管理画面からは変更できません。
								</p>
								<div className="overflow-x-auto">
									<pre className="max-h-32 overflow-y-auto rounded-lg bg-base-200 p-2 text-xs">
										{JSON.stringify(
											{
												localizedAttributes: data.settings.localizedAttributes,
												typoTolerance: data.settings.typoTolerance,
												displayedAttributes: data.settings.displayedAttributes,
											},
											null,
											2,
										)}
									</pre>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Modal Actions */}
				<div className="modal-action">
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						onClick={() => {
							if (
								window.confirm(
									"インデックス設定をデフォルトにリセットします。この操作は取り消せません。続行しますか？",
								)
							) {
								resetMutation.mutate();
							}
						}}
						disabled={resetMutation.isPending || isPending}
					>
						{resetMutation.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<RefreshCw className="h-4 w-4" />
						)}
						リセット
					</button>
					<button type="button" className="btn btn-sm" onClick={onClose}>
						閉じる
					</button>
					<button
						type="button"
						className="btn btn-primary btn-sm"
						onClick={() => updateMutation.mutate()}
						disabled={!hasChanges || updateMutation.isPending || isPending}
					>
						{updateMutation.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Save className="h-4 w-4" />
						)}
						保存
					</button>
				</div>
			</div>
			<form method="dialog" className="modal-backdrop">
				<button type="button" onClick={onClose}>
					close
				</button>
			</form>
		</dialog>
	);
}

// ===== Index Row Component =====

interface IndexRowProps {
	index: IndexStatus;
	isReindexing: boolean;
	isDisabled: boolean;
	onReindex: () => void;
	onOpenSettings: () => void;
}

function IndexRow({
	index,
	isReindexing,
	isDisabled,
	onReindex,
	onOpenSettings,
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
				<div className="flex items-center justify-end gap-1">
					<div
						className="tooltip tooltip-left"
						data-tip="検索対象・フィルター・ソートの属性を設定"
					>
						<button
							type="button"
							className="btn btn-ghost btn-sm"
							onClick={onOpenSettings}
						>
							<Settings className="h-4 w-4" />
							<span className="hidden sm:inline">設定</span>
						</button>
					</div>
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
				</div>
			</td>
		</tr>
	);
}

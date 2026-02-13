import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
	AlertCircle,
	CheckCircle,
	Home,
	Loader2,
	RefreshCw,
	Save,
	Search,
	Settings,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { searchApi } from "@/lib/api-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/search/settings/$index")({
	head: ({ params }) => createPageHead(`${params.index} インデックス設定`),
	component: IndexSettingsPage,
});

function IndexSettingsPage() {
	const { index: indexName } = useParams({
		from: "/admin/_admin/search/settings/$index",
	});
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

	if (isPending) {
		return (
			<div className="flex justify-center p-8">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (error || !data?.success) {
		return (
			<div className="container mx-auto p-4">
				<div className="alert alert-error">
					<AlertCircle className="h-4 w-4" />
					<span>
						{error?.message || data?.error || "設定の取得に失敗しました"}
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto space-y-4 p-4">
			{/* Breadcrumb */}
			<nav className="breadcrumbs text-sm">
				<ul>
					<li>
						<Link to="/admin">
							<Home className="h-4 w-4" />
						</Link>
					</li>
					<li>
						<Link to="/admin/search" className="flex items-center gap-1">
							<Search className="h-4 w-4" />
							検索管理
						</Link>
					</li>
					<li>{indexName} 設定</li>
				</ul>
			</nav>

			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="flex items-center gap-2 font-bold text-xl">
					<Settings className="h-6 w-6" />
					{indexName} インデックス設定
				</h1>
				<div className="flex gap-2">
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
						disabled={resetMutation.isPending}
					>
						{resetMutation.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<RefreshCw className="h-4 w-4" />
						)}
						リセット
					</button>
					<button
						type="button"
						className="btn btn-primary btn-sm"
						onClick={() => updateMutation.mutate()}
						disabled={!hasChanges || updateMutation.isPending}
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

			{/* Success/Error alerts */}
			{updateMutation.isSuccess && (
				<div className="alert alert-success">
					<CheckCircle className="h-4 w-4" />
					<span>設定を更新しました</span>
				</div>
			)}
			{updateMutation.error && (
				<div className="alert alert-error">
					<AlertCircle className="h-4 w-4" />
					<span>{updateMutation.error.message}</span>
				</div>
			)}

			{/* Settings Form */}
			<div className="grid gap-4">
				{/* Searchable Attributes */}
				<div className="card border border-base-300 bg-base-100">
					<div className="card-body">
						<div className="flex items-center gap-2">
							<h2 className="card-title text-base">検索対象属性</h2>
							<span className="badge badge-outline badge-sm">
								Searchable Attributes
							</span>
						</div>
						<p className="text-base-content/70 text-sm">
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
							className="input w-full"
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
					<div className="card-body">
						<div className="flex items-center gap-2">
							<h2 className="card-title text-base">フィルター属性</h2>
							<span className="badge badge-outline badge-sm">
								Filterable Attributes
							</span>
						</div>
						<p className="text-base-content/70 text-sm">
							検索結果を絞り込むためのフィルターとして使用可能なフィールドを指定します。例:「2024年のみ」「特定イベントのみ」など。
						</p>
						{filterableAttrs.length > 0 && (
							<div className="flex flex-wrap gap-1">
								{filterableAttrs.map((attr) => (
									<span key={attr} className="badge badge-secondary badge-sm">
										{attr}
									</span>
								))}
							</div>
						)}
						<input
							type="text"
							className="input w-full"
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
					<div className="card-body">
						<div className="flex items-center gap-2">
							<h2 className="card-title text-base">ソート属性</h2>
							<span className="badge badge-outline badge-sm">
								Sortable Attributes
							</span>
						</div>
						<p className="text-base-content/70 text-sm">
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
							className="input w-full"
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
					<div className="card-body">
						<h2 className="card-title text-base">
							その他の設定（読み取り専用）
						</h2>
						<p className="text-base-content/70 text-sm">
							これらの設定はコードで定義されており、管理画面からは変更できません。
						</p>
						<div className="overflow-x-auto">
							<pre className="rounded-lg bg-base-200 p-4 text-sm">
								{JSON.stringify(
									{
										localizedAttributes: data.settings?.localizedAttributes,
										typoTolerance: data.settings?.typoTolerance,
										displayedAttributes: data.settings?.displayedAttributes,
									},
									null,
									2,
								)}
							</pre>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

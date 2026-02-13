import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	CheckCircle,
	ChevronDown,
	Database,
	Home,
	Loader2,
	Plus,
	RefreshCw,
	Save,
	Search,
	Server,
	Settings,
	X,
	XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	type IndexStatus,
	type ReindexProgress,
	searchApi,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";

// ===== Available Attributes Definition =====

/**
 * TrackSearchDocumentの全フィールドを定義
 * packages/search/src/types.ts の TrackSearchDocument に基づく
 */
const AVAILABLE_ATTRIBUTES = [
	{ value: "id", label: "ID" },
	{ value: "name", label: "曲名" },
	{ value: "nameJa", label: "曲名（日本語）" },
	{ value: "nameEn", label: "曲名（英語）" },
	{ value: "releaseId", label: "リリースID" },
	{ value: "releaseName", label: "リリース名" },
	{ value: "releaseDate", label: "リリース日" },
	{ value: "releaseYear", label: "リリース年" },
	{ value: "trackNumber", label: "トラック番号" },
	{ value: "discNumber", label: "ディスク番号" },
	{ value: "eventName", label: "イベント名" },
	{ value: "circleNames", label: "サークル名" },
	{ value: "vocalists", label: "ボーカリスト" },
	{ value: "arrangers", label: "編曲者" },
	{ value: "lyricists", label: "作詞者" },
	{ value: "composers", label: "作曲者" },
	{ value: "originalSongs", label: "原曲" },
	{ value: "originalWorkNames", label: "原作名" },
	{ value: "createdAt", label: "作成日時" },
	{ value: "updatedAt", label: "更新日時" },
] as const;

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

// ===== Stop Words Editor Component =====

const PRESET_STOP_WORDS = [
	"の",
	"は",
	"が",
	"を",
	"に",
	"で",
	"と",
	"も",
	"や",
] as const;

interface StopWordsEditorProps {
	stopWords: string[];
	onChange: (stopWords: string[]) => void;
}

function StopWordsEditor({ stopWords, onChange }: StopWordsEditorProps) {
	const [inputValue, setInputValue] = useState("");

	const handleAdd = () => {
		const word = inputValue.trim();
		if (word && !stopWords.includes(word)) {
			onChange([...stopWords, word]);
			setInputValue("");
		}
	};

	const handleRemove = (word: string) => {
		onChange(stopWords.filter((w) => w !== word));
	};

	const handleAddPreset = (word: string) => {
		if (!stopWords.includes(word)) {
			onChange([...stopWords, word]);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleAdd();
		}
	};

	return (
		<div className="card border border-base-300 bg-base-100">
			<div className="card-body p-4">
				<div className="flex items-center gap-2">
					<h4 className="font-semibold text-sm">除外語</h4>
					<span className="badge badge-outline badge-xs">Stop Words</span>
				</div>
				<p className="text-base-content/70 text-xs">
					検索時に無視される単語を指定します。一般的な助詞や接続詞を登録することで検索精度が向上します。
				</p>

				{/* Selected stop words */}
				<div className="flex flex-wrap items-center gap-2">
					{stopWords.length > 0 ? (
						stopWords.map((word) => (
							<span key={word} className="badge badge-info badge-sm gap-1 pr-1">
								{word}
								<button
									type="button"
									className="btn btn-ghost btn-circle btn-xs hover:bg-base-content/20"
									onClick={() => handleRemove(word)}
									aria-label={`${word}を削除`}
								>
									<X className="h-3 w-3" />
								</button>
							</span>
						))
					) : (
						<span className="text-base-content/50 text-xs">
							除外語が設定されていません
						</span>
					)}
				</div>

				{/* Add new stop word */}
				<div className="flex items-center gap-2">
					<input
						type="text"
						className="input input-sm flex-1"
						placeholder="単語を入力..."
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
					/>
					<button
						type="button"
						className="btn btn-sm btn-primary"
						onClick={handleAdd}
						disabled={!inputValue.trim()}
					>
						<Plus className="h-3 w-3" />
						追加
					</button>
				</div>

				{/* Preset suggestions */}
				<div className="flex flex-wrap items-center gap-1">
					<span className="text-base-content/60 text-xs">よく使う除外語:</span>
					{PRESET_STOP_WORDS.map((word) => (
						<button
							key={word}
							type="button"
							className={`btn btn-ghost btn-xs ${stopWords.includes(word) ? "btn-disabled opacity-50" : ""}`}
							onClick={() => handleAddPreset(word)}
							disabled={stopWords.includes(word)}
						>
							{word}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

// ===== Synonyms Editor Component =====

interface SynonymsEditorProps {
	synonyms: Record<string, string[]>;
	onChange: (synonyms: Record<string, string[]>) => void;
}

function SynonymsEditor({ synonyms, onChange }: SynonymsEditorProps) {
	const [newKeyword, setNewKeyword] = useState("");
	const [newSynonym, setNewSynonym] = useState("");

	const handleAddSynonym = (keyword: string, synonym: string) => {
		const trimmedSynonym = synonym.trim();
		if (!trimmedSynonym) return;

		const currentSynonyms = synonyms[keyword] || [];
		if (!currentSynonyms.includes(trimmedSynonym)) {
			onChange({
				...synonyms,
				[keyword]: [...currentSynonyms, trimmedSynonym],
			});
		}
	};

	const handleRemoveSynonym = (keyword: string, synonym: string) => {
		const currentSynonyms = synonyms[keyword] || [];
		const newSynonyms = currentSynonyms.filter((s) => s !== synonym);
		if (newSynonyms.length === 0) {
			const { [keyword]: _, ...rest } = synonyms;
			onChange(rest);
		} else {
			onChange({
				...synonyms,
				[keyword]: newSynonyms,
			});
		}
	};

	const handleRemoveKeyword = (keyword: string) => {
		const { [keyword]: _, ...rest } = synonyms;
		onChange(rest);
	};

	const handleAddNewKeyword = () => {
		const trimmedKeyword = newKeyword.trim();
		const trimmedSynonym = newSynonym.trim();
		if (!trimmedKeyword || !trimmedSynonym) return;

		const currentSynonyms = synonyms[trimmedKeyword] || [];
		if (!currentSynonyms.includes(trimmedSynonym)) {
			onChange({
				...synonyms,
				[trimmedKeyword]: [...currentSynonyms, trimmedSynonym],
			});
		}
		setNewKeyword("");
		setNewSynonym("");
	};

	return (
		<div className="card border border-base-300 bg-base-100">
			<div className="card-body p-4">
				<div className="flex items-center gap-2">
					<h4 className="font-semibold text-sm">同義語</h4>
					<span className="badge badge-outline badge-xs">Synonyms</span>
				</div>
				<p className="text-base-content/70 text-xs">
					同じ意味として扱う単語のグループを指定します。キーワードで検索した際に同義語も検索対象になります。
				</p>

				{/* Existing synonyms */}
				{Object.keys(synonyms).length > 0 ? (
					<div className="space-y-2">
						{Object.entries(synonyms).map(([keyword, synonymList]) => (
							<SynonymRow
								key={keyword}
								keyword={keyword}
								synonymList={synonymList}
								onAddSynonym={(synonym) => handleAddSynonym(keyword, synonym)}
								onRemoveSynonym={(synonym) =>
									handleRemoveSynonym(keyword, synonym)
								}
								onRemoveKeyword={() => handleRemoveKeyword(keyword)}
							/>
						))}
					</div>
				) : (
					<span className="text-base-content/50 text-xs">
						同義語が設定されていません
					</span>
				)}

				{/* Add new synonym group */}
				<div className="mt-2 space-y-2 border-base-300 border-t pt-2">
					<span className="text-base-content/70 text-xs">新規追加:</span>
					<div className="flex flex-wrap items-center gap-2">
						<div className="flex items-center gap-1">
							<span className="text-xs">キーワード:</span>
							<input
								type="text"
								className="input input-sm w-24"
								placeholder="例: 東方"
								value={newKeyword}
								onChange={(e) => setNewKeyword(e.target.value)}
							/>
						</div>
						<div className="flex items-center gap-1">
							<span className="text-xs">同義語:</span>
							<input
								type="text"
								className="input input-sm w-24"
								placeholder="例: Touhou"
								value={newSynonym}
								onChange={(e) => setNewSynonym(e.target.value)}
							/>
						</div>
						<button
							type="button"
							className="btn btn-sm btn-primary"
							onClick={handleAddNewKeyword}
							disabled={!newKeyword.trim() || !newSynonym.trim()}
						>
							<Plus className="h-3 w-3" />
							追加
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// ===== Synonym Row Component =====

interface SynonymRowProps {
	keyword: string;
	synonymList: string[];
	onAddSynonym: (synonym: string) => void;
	onRemoveSynonym: (synonym: string) => void;
	onRemoveKeyword: () => void;
}

function SynonymRow({
	keyword,
	synonymList,
	onAddSynonym,
	onRemoveSynonym,
	onRemoveKeyword,
}: SynonymRowProps) {
	const [newSynonym, setNewSynonym] = useState("");

	const handleAdd = () => {
		if (newSynonym.trim()) {
			onAddSynonym(newSynonym.trim());
			setNewSynonym("");
		}
	};

	return (
		<div className="flex flex-wrap items-center gap-2 rounded-lg bg-base-200 p-2">
			<span className="font-medium text-sm">{keyword}</span>
			<span className="text-base-content/50">→</span>
			{synonymList.map((synonym) => (
				<span key={synonym} className="badge badge-warning badge-sm gap-1 pr-1">
					{synonym}
					<button
						type="button"
						className="btn btn-ghost btn-circle btn-xs hover:bg-base-content/20"
						onClick={() => onRemoveSynonym(synonym)}
						aria-label={`${synonym}を削除`}
					>
						<X className="h-3 w-3" />
					</button>
				</span>
			))}
			<input
				type="text"
				className="input input-xs w-20"
				placeholder="追加..."
				value={newSynonym}
				onChange={(e) => setNewSynonym(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						handleAdd();
					}
				}}
			/>
			<button
				type="button"
				className="btn btn-ghost btn-xs text-error"
				onClick={onRemoveKeyword}
				aria-label={`${keyword}の同義語グループを削除`}
			>
				<X className="h-3 w-3" />
			</button>
		</div>
	);
}

// ===== Ranking Rules Editor Component =====

const MEILISEARCH_RANKING_RULES = [
	{
		value: "words",
		label: "一致単語数",
		description: "検索語との一致数が多いほど上位",
	},
	{
		value: "typo",
		label: "タイプミス数",
		description: "タイプミスが少ないほど上位",
	},
	{
		value: "proximity",
		label: "単語の近さ",
		description: "検索語同士が近いほど上位",
	},
	{
		value: "attribute",
		label: "属性の優先度",
		description: "検索属性の順序に基づく優先度",
	},
	{ value: "sort", label: "ソート順", description: "ソート条件による並び順" },
	{
		value: "exactness",
		label: "完全一致",
		description: "完全一致するほど上位",
	},
] as const;

interface RankingRulesEditorProps {
	rankingRules: string[];
	onChange: (rankingRules: string[]) => void;
}

function RankingRulesEditor({
	rankingRules,
	onChange,
}: RankingRulesEditorProps) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const availableToAdd = MEILISEARCH_RANKING_RULES.filter(
		(rule) => !rankingRules.includes(rule.value),
	);

	const getLabel = (value: string) => {
		const rule = MEILISEARCH_RANKING_RULES.find((r) => r.value === value);
		return rule ? rule.label : value;
	};

	const getDescription = (value: string) => {
		const rule = MEILISEARCH_RANKING_RULES.find((r) => r.value === value);
		return rule ? rule.description : "";
	};

	const handleAdd = (value: string) => {
		onChange([...rankingRules, value]);
		setIsOpen(false);
	};

	const handleRemove = (value: string) => {
		onChange(rankingRules.filter((r) => r !== value));
	};

	const handleMoveUp = (index: number) => {
		if (index === 0) return;
		const newRules = [...rankingRules];
		[newRules[index - 1], newRules[index]] = [
			newRules[index],
			newRules[index - 1],
		];
		onChange(newRules);
	};

	const handleMoveDown = (index: number) => {
		if (index === rankingRules.length - 1) return;
		const newRules = [...rankingRules];
		[newRules[index], newRules[index + 1]] = [
			newRules[index + 1],
			newRules[index],
		];
		onChange(newRules);
	};

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	return (
		<div className="card border border-base-300 bg-base-100">
			<div className="card-body p-4">
				<div className="flex items-center gap-2">
					<h4 className="font-semibold text-sm">ランキングルール</h4>
					<span className="badge badge-outline badge-xs">Ranking Rules</span>
				</div>
				<p className="text-base-content/70 text-xs">
					検索結果の関連性計算の優先順位を指定します。上から順に優先度が高くなります。
				</p>

				{/* Ranking rules list */}
				{rankingRules.length > 0 ? (
					<div className="space-y-1">
						{rankingRules.map((rule, index) => (
							<div
								key={rule}
								className="flex items-center gap-2 rounded-lg bg-base-200 px-3 py-2"
							>
								<span className="font-mono text-base-content/50 text-xs">
									{index + 1}.
								</span>
								<div className="flex-1">
									<span className="font-medium text-sm">{getLabel(rule)}</span>
									<span className="ml-2 text-base-content/50 text-xs">
										- {getDescription(rule)}
									</span>
								</div>
								<div className="flex items-center gap-1">
									<button
										type="button"
										className="btn btn-ghost btn-xs"
										onClick={() => handleMoveUp(index)}
										disabled={index === 0}
										aria-label="上に移動"
									>
										↑
									</button>
									<button
										type="button"
										className="btn btn-ghost btn-xs"
										onClick={() => handleMoveDown(index)}
										disabled={index === rankingRules.length - 1}
										aria-label="下に移動"
									>
										↓
									</button>
									<button
										type="button"
										className="btn btn-ghost btn-xs text-error"
										onClick={() => handleRemove(rule)}
										aria-label={`${getLabel(rule)}を削除`}
									>
										<X className="h-3 w-3" />
									</button>
								</div>
							</div>
						))}
					</div>
				) : (
					<span className="text-base-content/50 text-xs">
						ランキングルールが設定されていません
					</span>
				)}

				{/* Add ranking rule dropdown */}
				{availableToAdd.length > 0 && (
					<div className="dropdown" ref={dropdownRef}>
						<button
							type="button"
							className="btn btn-ghost btn-sm gap-1"
							onClick={() => setIsOpen(!isOpen)}
						>
							<Plus className="h-3 w-3" />
							ルールを追加
							<ChevronDown
								className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
							/>
						</button>
						{isOpen && (
							<ul className="menu dropdown-content z-[1] w-64 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
								{availableToAdd.map((rule) => (
									<li key={rule.value}>
										<button
											type="button"
											className="flex-col items-start text-sm"
											onClick={() => handleAdd(rule.value)}
										>
											<span className="font-medium">{rule.label}</span>
											<span className="text-base-content/50 text-xs">
												{rule.description}
											</span>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

// ===== Attribute Selector Component =====

interface AttributeSelectorProps {
	label: string;
	englishLabel: string;
	description: string;
	selectedAttributes: string[];
	onAdd: (attr: string) => void;
	onRemove: (attr: string) => void;
	badgeColor: "badge-primary" | "badge-secondary" | "badge-accent";
}

function AttributeSelector({
	label,
	englishLabel,
	description,
	selectedAttributes,
	onAdd,
	onRemove,
	badgeColor,
}: AttributeSelectorProps) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Filter out already selected attributes
	const availableToAdd = AVAILABLE_ATTRIBUTES.filter(
		(attr) => !selectedAttributes.includes(attr.value),
	);

	// Get label for attribute value
	const getLabel = (value: string) => {
		const attr = AVAILABLE_ATTRIBUTES.find((a) => a.value === value);
		return attr ? attr.label : value;
	};

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	return (
		<div className="card border border-base-300 bg-base-100">
			<div className="card-body p-4">
				<div className="flex items-center gap-2">
					<h4 className="font-semibold text-sm">{label}</h4>
					<span className="badge badge-outline badge-xs">{englishLabel}</span>
				</div>
				<p className="text-base-content/70 text-xs">{description}</p>

				{/* Selected attributes as badges */}
				<div className="flex flex-wrap items-center gap-2">
					{selectedAttributes.length > 0 ? (
						selectedAttributes.map((attr) => (
							<span
								key={attr}
								className={`badge ${badgeColor} badge-sm gap-1 pr-1`}
							>
								{getLabel(attr)}
								<button
									type="button"
									className="btn btn-ghost btn-circle btn-xs hover:bg-base-content/20"
									onClick={() => onRemove(attr)}
									aria-label={`${getLabel(attr)}を削除`}
								>
									<X className="h-3 w-3" />
								</button>
							</span>
						))
					) : (
						<span className="text-base-content/50 text-xs">
							属性が選択されていません
						</span>
					)}

					{/* Add attribute dropdown */}
					{availableToAdd.length > 0 && (
						<div className="dropdown dropdown-end" ref={dropdownRef}>
							<button
								type="button"
								className="btn btn-ghost btn-xs gap-1"
								onClick={() => setIsOpen(!isOpen)}
							>
								<Plus className="h-3 w-3" />
								追加
								<ChevronDown
									className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
								/>
							</button>
							{isOpen && (
								<ul className="menu dropdown-content z-[1] max-h-60 w-52 overflow-y-auto rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
									{availableToAdd.map((attr) => (
										<li key={attr.value}>
											<button
												type="button"
												className="text-sm"
												onClick={() => {
													onAdd(attr.value);
													setIsOpen(false);
												}}
											>
												<span className="font-medium">{attr.label}</span>
												<span className="text-base-content/50 text-xs">
													{attr.value}
												</span>
											</button>
										</li>
									))}
								</ul>
							)}
						</div>
					)}
				</div>
			</div>
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
	const [stopWords, setStopWords] = useState<string[]>([]);
	const [synonyms, setSynonyms] = useState<Record<string, string[]>>({});
	const [rankingRules, setRankingRules] = useState<string[]>([]);
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
			setStopWords(data.settings.stopWords || []);
			setSynonyms(data.settings.synonyms || {});
			setRankingRules(data.settings.rankingRules || []);
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
				stopWords,
				synonyms,
				rankingRules,
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

	// Handle attribute add
	const handleAddAttribute = useCallback(
		(setter: React.Dispatch<React.SetStateAction<string[]>>) =>
			(attr: string) => {
				setter((prev) => [...prev, attr]);
				setHasChanges(true);
			},
		[],
	);

	// Handle attribute remove
	const handleRemoveAttribute = useCallback(
		(setter: React.Dispatch<React.SetStateAction<string[]>>) =>
			(attr: string) => {
				setter((prev) => prev.filter((a) => a !== attr));
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
						<AttributeSelector
							label="検索対象属性"
							englishLabel="Searchable Attributes"
							description="キーワード検索時に対象となるフィールドを指定します。ユーザーが検索したキーワードは、ここで指定された属性から検索されます。"
							selectedAttributes={searchableAttrs}
							onAdd={handleAddAttribute(setSearchableAttrs)}
							onRemove={handleRemoveAttribute(setSearchableAttrs)}
							badgeColor="badge-primary"
						/>

						{/* Filterable Attributes */}
						<AttributeSelector
							label="フィルター属性"
							englishLabel="Filterable Attributes"
							description="検索結果を絞り込むためのフィルターとして使用可能なフィールドを指定します。例:「2024年のみ」「特定イベントのみ」など。"
							selectedAttributes={filterableAttrs}
							onAdd={handleAddAttribute(setFilterableAttrs)}
							onRemove={handleRemoveAttribute(setFilterableAttrs)}
							badgeColor="badge-secondary"
						/>

						{/* Sortable Attributes */}
						<AttributeSelector
							label="ソート属性"
							englishLabel="Sortable Attributes"
							description="検索結果の並び替えに使用可能なフィールドを指定します。例:「新しい順」「名前順」など。"
							selectedAttributes={sortableAttrs}
							onAdd={handleAddAttribute(setSortableAttrs)}
							onRemove={handleRemoveAttribute(setSortableAttrs)}
							badgeColor="badge-accent"
						/>

						{/* Stop Words */}
						<StopWordsEditor
							stopWords={stopWords}
							onChange={(newStopWords) => {
								setStopWords(newStopWords);
								setHasChanges(true);
							}}
						/>

						{/* Synonyms */}
						<SynonymsEditor
							synonyms={synonyms}
							onChange={(newSynonyms) => {
								setSynonyms(newSynonyms);
								setHasChanges(true);
							}}
						/>

						{/* Ranking Rules */}
						<RankingRulesEditor
							rankingRules={rankingRules}
							onChange={(newRankingRules) => {
								setRankingRules(newRankingRules);
								setHasChanges(true);
							}}
						/>

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

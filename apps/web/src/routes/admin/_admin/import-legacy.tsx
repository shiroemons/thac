/**
 * レガシーCSVインポートページ
 *
 * 4ステップウィザード:
 * 1. CSVアップロード
 * 2. イベント登録（新規イベントがある場合のみ）
 * 3. 原曲マッピング
 * 4. インポート結果
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	ArrowRight,
	Calendar,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	FileUp,
	Home,
	Info,
	Link2,
	Loader2,
	Music,
	Plus,
	Search,
	Sparkles,
	Upload,
	XCircle,
} from "lucide-react";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
	type EntityProgressMap,
	type EventMatchSuggestion,
	type ExistingEventWithDays,
	eventSeriesApi,
	type ImportProgress,
	type ImportStage,
	type LegacyCSVRecord,
	type LegacyImportResult,
	legacyImportApi,
	type NewEventInput,
	type NewEventNeeded,
	type SongMatchResult,
} from "@/lib/api-client";
import {
	type EventSeries as EventSeriesType,
	extractSeriesName,
	suggestFromEventName,
} from "@/lib/event-name-parser";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/import-legacy")({
	head: () => createPageHead("レガシーCSVインポート"),
	component: LegacyImportPage,
});

type WizardStep =
	| "upload"
	| "event-mapping"
	| "events"
	| "mapping"
	| "importing"
	| "result";

function LegacyImportPage() {
	const [step, setStep] = useState<WizardStep>("upload");
	const [records, setRecords] = useState<LegacyCSVRecord[]>([]);
	const [songMatches, setSongMatches] = useState<SongMatchResult[]>([]);
	const [newEventsNeeded, setNewEventsNeeded] = useState<NewEventNeeded[]>([]);
	const [mappings, setMappings] = useState<Record<string, string>>({});
	const [customSongNames, setCustomSongNames] = useState<
		Record<string, string>
	>({});
	const [newEventInputs, setNewEventInputs] = useState<
		Record<string, NewEventInput>
	>({});
	const [existingEventsWithDays, setExistingEventsWithDays] = useState<
		ExistingEventWithDays[]
	>([]);
	const [eventDayMappings, setEventDayMappings] = useState<
		Record<string, string>
	>({});
	const [eventMatchSuggestions, setEventMatchSuggestions] = useState<
		EventMatchSuggestion[]
	>([]);
	const [eventNameMappings, setEventNameMappings] = useState<
		Record<string, string>
	>({});
	const [parseErrors, setParseErrors] = useState<
		{ row: number; message: string }[]
	>([]);
	const [importResult, setImportResult] = useState<LegacyImportResult | null>(
		null,
	);
	const [importStage, setImportStage] = useState<ImportStage>("preparing");
	const [importProgress, setImportProgress] = useState(0);
	const [entityProgress, setEntityProgress] =
		useState<EntityProgressMap | null>(null);

	// プレビューAPI
	const previewMutation = useMutation({
		mutationFn: legacyImportApi.preview,
		onSuccess: async (data) => {
			if (data.success) {
				setRecords(data.records);
				setSongMatches(data.songMatches);
				setNewEventsNeeded(data.newEventsNeeded);
				setParseErrors(data.errors);

				// 自動マッチングされた結果をマッピングに設定
				const autoMappings: Record<string, string> = {};
				const autoCustomSongNames: Record<string, string> = {};
				for (const match of data.songMatches) {
					if (match.autoMatched && match.selectedId) {
						autoMappings[match.originalName] = match.selectedId;
					}
					// customSongNameが設定されている場合（マッチなしの原曲）
					if (match.customSongName) {
						autoCustomSongNames[match.originalName] = match.customSongName;
					}
				}
				setMappings(autoMappings);
				setCustomSongNames(autoCustomSongNames);

				// 新規イベントのデフォルト値を設定（イベントシリーズの自動推察付き）
				try {
					const seriesResponse = await eventSeriesApi.list();
					const seriesList = seriesResponse.data;
					const defaultEventInputs: Record<string, NewEventInput> = {};
					for (const event of data.newEventsNeeded) {
						const suggestion = suggestFromEventName(event.name, seriesList);
						defaultEventInputs[event.name] = {
							name: event.name,
							totalDays: 1,
							startDate: "",
							endDate: "",
							eventDates: [""],
							eventSeriesId: suggestion.seriesId ?? null,
							eventSeriesName: null,
						};
					}
					setNewEventInputs(defaultEventInputs);
				} catch {
					// シリーズ取得に失敗した場合はシリーズなしで初期化
					const defaultEventInputs: Record<string, NewEventInput> = {};
					for (const event of data.newEventsNeeded) {
						defaultEventInputs[event.name] = {
							name: event.name,
							totalDays: 1,
							startDate: "",
							endDate: "",
							eventDates: [""],
							eventSeriesId: null,
							eventSeriesName: null,
						};
					}
					setNewEventInputs(defaultEventInputs);
				}

				// 複数日を持つ既存イベントのデフォルト選択（1日目）
				const existingEvents = data.existingEventsWithDays || [];
				setExistingEventsWithDays(existingEvents);
				const defaultEventDayMappings: Record<string, string> = {};
				for (const event of existingEvents) {
					if (event.eventDays.length > 0 && event.eventDays[0]) {
						defaultEventDayMappings[event.eventName] = event.eventDays[0].id;
					}
				}
				setEventDayMappings(defaultEventDayMappings);

				// イベントマッチング候補を設定
				const suggestions = data.eventMatchSuggestions || [];
				setEventMatchSuggestions(suggestions);

				// 自動マッピングを設定（annotation_pair の自動マッピング）
				const autoEventMappings: Record<string, string> = {};
				for (const s of suggestions) {
					if (s.matchType === "annotation_pair" && s.suggestedEventName) {
						autoEventMappings[s.csvEventName] = s.suggestedEventName;
					} else if (s.matchType === "fuzzy" && s.suggestedEventName) {
						autoEventMappings[s.csvEventName] = s.suggestedEventName;
					}
				}
				setEventNameMappings(autoEventMappings);

				// イベントマッピングが必要かチェック
				const needsEventMapping = suggestions.some(
					(s) =>
						s.matchType === "annotation_pair" ||
						s.matchType === "fuzzy" ||
						(s.matchType === "none" && s.annotation !== null),
				);

				if (needsEventMapping) {
					setStep("event-mapping");
				} else if (
					data.newEventsNeeded.length > 0 ||
					(data.existingEventsWithDays || []).length > 0
				) {
					setStep("events");
				} else {
					setStep("mapping");
				}
			} else {
				setParseErrors(data.errors);
			}
		},
	});

	// 進捗コールバック
	const handleProgress = useCallback((progress: ImportProgress) => {
		setImportStage(progress.stage);
		if (progress.entityProgress) {
			setEntityProgress(progress.entityProgress);
			// トラック進捗をパーセンテージに変換
			const tracks = progress.entityProgress.tracks;
			if (tracks.total > 0) {
				setImportProgress(Math.round((tracks.processed / tracks.total) * 100));
			}
		}
	}, []);

	// 実行API（SSEストリーミング対応）
	const executeMutation = useMutation({
		mutationFn: async () => {
			const newEvents =
				newEventsNeeded.length > 0
					? Object.values(newEventInputs).filter((e) => e.startDate !== "")
					: undefined;
			const eventDayMappingsToSend =
				existingEventsWithDays.length > 0 ? eventDayMappings : undefined;
			const eventNameMappingsToSend =
				Object.keys(eventNameMappings).length > 0
					? eventNameMappings
					: undefined;
			return legacyImportApi.executeWithProgress(
				records,
				mappings,
				customSongNames,
				newEvents,
				handleProgress,
				eventDayMappingsToSend,
				eventNameMappingsToSend,
			);
		},
		onMutate: () => {
			// インポート開始時に進捗表示を開始
			setStep("importing");
			setImportStage("preparing");
			setImportProgress(0);
			setEntityProgress(null);
		},
		onSuccess: (data) => {
			setImportStage("complete");
			setImportProgress(100);
			setImportResult(data);
			// 少し待ってから結果画面へ
			setTimeout(() => {
				setStep("result");
			}, 500);
		},
		onError: () => {
			setImportStage("complete");
			setImportProgress(100);
		},
	});

	// ファイルアップロードハンドラ
	const handleFileUpload = useCallback(
		(file: File) => {
			setParseErrors([]);
			previewMutation.mutate(file);
		},
		[previewMutation],
	);

	// マッピング更新ハンドラ
	const handleMappingChange = useCallback(
		(originalName: string, selectedId: string | null) => {
			setMappings((prev) => {
				if (selectedId === null) {
					const { [originalName]: _, ...rest } = prev;
					return rest;
				}
				return { ...prev, [originalName]: selectedId };
			});
		},
		[],
	);

	// customSongName更新ハンドラ
	const handleCustomSongNameChange = useCallback(
		(originalName: string, customName: string) => {
			setCustomSongNames((prev) => ({ ...prev, [originalName]: customName }));
		},
		[],
	);

	// イベント入力更新ハンドラ
	const handleEventInputChange = useCallback(
		(eventName: string, input: Partial<NewEventInput>) => {
			setNewEventInputs((prev) => ({
				...prev,
				[eventName]: { ...prev[eventName], ...input } as NewEventInput,
			}));
		},
		[],
	);

	// 既存イベントのイベント日選択ハンドラ
	const handleEventDayChange = useCallback(
		(eventName: string, eventDayId: string) => {
			setEventDayMappings((prev) => ({
				...prev,
				[eventName]: eventDayId,
			}));
		},
		[],
	);

	// イベントマッピングが必要かどうか
	const needsEventMappingStep = eventMatchSuggestions.some(
		(s) =>
			s.matchType === "annotation_pair" ||
			s.matchType === "fuzzy" ||
			(s.matchType === "none" && s.annotation !== null),
	);

	// イベント設定が必要かどうか
	const needsEventStep =
		newEventsNeeded.length > 0 || existingEventsWithDays.length > 0;

	// 次へハンドラ
	const handleNext = useCallback(() => {
		if (step === "event-mapping") {
			// マッピング結果を適用して、新規イベントリストを更新
			const mappedEventNames = new Set(Object.keys(eventNameMappings));
			const updatedNewEvents = newEventsNeeded.filter(
				(e) => !mappedEventNames.has(e.name),
			);
			setNewEventsNeeded(updatedNewEvents);

			if (updatedNewEvents.length > 0 || existingEventsWithDays.length > 0) {
				setStep("events");
			} else {
				setStep("mapping");
			}
		} else if (step === "events") {
			setStep("mapping");
		} else if (step === "mapping") {
			executeMutation.mutate();
		}
	}, [
		step,
		executeMutation,
		eventNameMappings,
		newEventsNeeded,
		existingEventsWithDays,
	]);

	// 戻るハンドラ
	const handleBack = useCallback(() => {
		if (step === "event-mapping") {
			setStep("upload");
		} else if (step === "events") {
			if (needsEventMappingStep) {
				setStep("event-mapping");
			} else {
				setStep("upload");
			}
		} else if (step === "mapping") {
			if (needsEventStep) {
				setStep("events");
			} else if (needsEventMappingStep) {
				setStep("event-mapping");
			} else {
				setStep("upload");
			}
		}
	}, [step, needsEventStep, needsEventMappingStep]);

	// リセットハンドラ
	const handleReset = useCallback(() => {
		setStep("upload");
		setRecords([]);
		setSongMatches([]);
		setNewEventsNeeded([]);
		setMappings({});
		setCustomSongNames({});
		setNewEventInputs({});
		setExistingEventsWithDays([]);
		setEventDayMappings({});
		setEventMatchSuggestions([]);
		setEventNameMappings({});
		setParseErrors([]);
		setImportResult(null);
	}, []);

	// イベントステップをスキップするかどうか
	const skipEventsStep = !needsEventStep;
	const skipEventMappingStep = !needsEventMappingStep;

	return (
		<div className="container mx-auto space-y-6 p-6">
			{/* パンくずナビゲーション */}
			<nav className="breadcrumbs text-sm">
				<ul>
					<li>
						<Link to="/admin">
							<Home className="h-4 w-4" />
						</Link>
					</li>
					<li>レガシーCSVインポート</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-2xl">レガシーCSVインポート</h1>
			<p className="text-base-content/70">
				旧システムのCSVデータをインポートします
			</p>

			{/* ステップインジケーター */}
			<div className="mb-8">
				<ul className="steps w-full">
					<li
						className={`step ${["upload", "event-mapping", "events", "mapping", "importing", "result"].includes(step) ? "step-primary" : ""}`}
					>
						CSVアップロード
					</li>
					<li
						className={`step ${["event-mapping", "events", "mapping", "importing", "result"].includes(step) ? "step-primary" : ""}`}
					>
						{step !== "upload" && skipEventMappingStep
							? "イベントマッピング（スキップ）"
							: "イベントマッピング"}
					</li>
					<li
						className={`step ${["events", "mapping", "importing", "result"].includes(step) ? "step-primary" : ""}`}
					>
						{step !== "upload" && step !== "event-mapping" && skipEventsStep
							? "イベント登録（スキップ）"
							: "イベント登録"}
					</li>
					<li
						className={`step ${["mapping", "importing", "result"].includes(step) ? "step-primary" : ""}`}
					>
						原曲マッピング
					</li>
					<li
						className={`step ${["importing", "result"].includes(step) ? "step-primary" : ""}`}
					>
						インポート実行
					</li>
					<li className={`step ${step === "result" ? "step-primary" : ""}`}>
						結果
					</li>
				</ul>
			</div>

			{/* ステップコンテンツ */}
			<div className="card border border-base-300 bg-base-100">
				<div className="card-body">
					{step === "upload" && (
						<UploadStep
							onUpload={handleFileUpload}
							isLoading={previewMutation.isPending}
							errors={parseErrors}
						/>
					)}

					{step === "event-mapping" && (
						<EventMappingStep
							suggestions={eventMatchSuggestions}
							eventNameMappings={eventNameMappings}
							onMappingChange={(csvName, resolvedName) => {
								setEventNameMappings((prev) => {
									if (resolvedName === null) {
										const { [csvName]: _, ...rest } = prev;
										return rest;
									}
									return { ...prev, [csvName]: resolvedName };
								});
							}}
						/>
					)}

					{step === "events" && (
						<EventRegistrationStep
							events={newEventsNeeded}
							eventInputs={newEventInputs}
							onEventInputChange={handleEventInputChange}
							existingEventsWithDays={existingEventsWithDays}
							eventDayMappings={eventDayMappings}
							onEventDayChange={handleEventDayChange}
						/>
					)}

					{step === "mapping" && (
						<MappingStep
							records={records}
							songMatches={songMatches}
							mappings={mappings}
							customSongNames={customSongNames}
							onMappingChange={handleMappingChange}
							onCustomSongNameChange={handleCustomSongNameChange}
						/>
					)}

					{step === "importing" && (
						<ImportingStep
							stage={importStage}
							progress={importProgress}
							entityProgress={entityProgress}
						/>
					)}

					{step === "result" && importResult && (
						<ResultStep result={importResult} onReset={handleReset} />
					)}
				</div>

				{/* ナビゲーションボタン */}
				{step !== "result" && step !== "importing" && (
					<div className="card-actions justify-between border-base-300 border-t px-6 py-4">
						<button
							type="button"
							className="btn btn-ghost"
							onClick={handleBack}
							disabled={step === "upload"}
						>
							<ChevronLeft className="h-4 w-4" />
							戻る
						</button>

						{(step === "event-mapping" ||
							step === "events" ||
							step === "mapping") && (
							<button
								type="button"
								className="btn btn-primary"
								onClick={handleNext}
								disabled={executeMutation.isPending}
							>
								{step === "event-mapping" || step === "events" ? (
									<>
										次へ
										<ChevronRight className="h-4 w-4" />
									</>
								) : (
									<>
										インポート実行
										<ChevronRight className="h-4 w-4" />
									</>
								)}
							</button>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

// ステップ1: CSVアップロード
interface UploadStepProps {
	onUpload: (file: File) => void;
	isLoading: boolean;
	errors: { row: number; message: string }[];
}

function UploadStep({ onUpload, isLoading, errors }: UploadStepProps) {
	const [dragActive, setDragActive] = useState(false);

	const handleDrag = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setDragActive(false);

			if (e.dataTransfer.files?.[0]) {
				const file = e.dataTransfer.files[0];
				if (file.name.endsWith(".csv")) {
					onUpload(file);
				}
			}
		},
		[onUpload],
	);

	const handleFileInput = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (e.target.files?.[0]) {
				onUpload(e.target.files[0]);
			}
		},
		[onUpload],
	);

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h3 className="font-semibold text-lg">CSVファイルをアップロード</h3>
				<p className="text-base-content/70 text-sm">
					旧システムからエクスポートしたCSVファイルをドラッグ&ドロップまたは選択してください
				</p>
			</div>

			{/* ドロップゾーン */}
			<div
				role="region"
				aria-label="ファイルドロップゾーン"
				className={`rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
					dragActive
						? "border-primary bg-primary/5"
						: "border-base-300 hover:border-primary"
				} ${isLoading ? "pointer-events-none opacity-50" : ""}`}
				onDragEnter={handleDrag}
				onDragLeave={handleDrag}
				onDragOver={handleDrag}
				onDrop={handleDrop}
			>
				{isLoading ? (
					<div className="flex flex-col items-center gap-4">
						<Loader2 className="h-12 w-12 animate-spin text-primary" />
						<p>CSVを解析中...</p>
					</div>
				) : (
					<>
						<FileUp className="mx-auto h-12 w-12 text-base-content/40" />
						<p className="mt-4 text-base-content/70">
							ここにCSVファイルをドロップ
						</p>
						<p className="text-base-content/40 text-sm">または</p>
						<label className="btn btn-primary mt-4">
							<Upload className="h-4 w-4" />
							ファイルを選択
							<input
								type="file"
								accept=".csv"
								className="hidden"
								onChange={handleFileInput}
							/>
						</label>
					</>
				)}
			</div>

			{/* エラー表示 */}
			{errors.length > 0 && (
				<div className="alert alert-error">
					<AlertCircle className="h-4 w-4" />
					<div>
						<h4 className="font-semibold">パースエラー</h4>
						<ul className="list-disc pl-4 text-sm">
							{errors.map((error) => (
								<li key={`${error.row}-${error.message}`}>
									行 {error.row}: {error.message}
								</li>
							))}
						</ul>
					</div>
				</div>
			)}

			{/* CSVフォーマット説明 */}
			<div className="collapse-arrow collapse border border-base-300 bg-base-200">
				<input type="checkbox" />
				<div className="collapse-title font-medium">
					CSVフォーマットについて
				</div>
				<div className="collapse-content">
					<div className="overflow-x-auto">
						<table className="table-zebra table-xs table">
							<thead>
								<tr>
									<th>カラム名</th>
									<th>説明</th>
									<th>例</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>circle</td>
									<td>サークル名（×区切りで複数可）</td>
									<td>サークルA×サークルB</td>
								</tr>
								<tr>
									<td>album</td>
									<td>アルバム名</td>
									<td>アルバムタイトル</td>
								</tr>
								<tr>
									<td>title</td>
									<td>曲名</td>
									<td>曲タイトル</td>
								</tr>
								<tr>
									<td>track_number</td>
									<td>トラック番号</td>
									<td>1</td>
								</tr>
								<tr>
									<td>event</td>
									<td>イベント名</td>
									<td>コミケ100</td>
								</tr>
								<tr>
									<td>vocalists</td>
									<td>ボーカル（:区切りで複数可）</td>
									<td>ボーカルA:ボーカルB</td>
								</tr>
								<tr>
									<td>arrangers</td>
									<td>アレンジャー（:区切りで複数可）</td>
									<td>アレンジャーA</td>
								</tr>
								<tr>
									<td>lyricists</td>
									<td>作詞（:区切りで複数可）</td>
									<td>作詞A</td>
								</tr>
								<tr>
									<td>original_songs</td>
									<td>原曲（:区切りで複数可）</td>
									<td>原曲A:原曲B</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}

// イベントマッピングステップ
interface EventMappingStepProps {
	suggestions: EventMatchSuggestion[];
	eventNameMappings: Record<string, string>;
	onMappingChange: (csvName: string, resolvedName: string | null) => void;
}

function EventMappingStep({
	suggestions,
	eventNameMappings,
	onMappingChange,
}: EventMappingStepProps) {
	// 表示対象のみフィルタ（exactはスキップ、annotationなしのnoneもスキップ）
	const annotationPairs = useMemo(
		() => suggestions.filter((s) => s.matchType === "annotation_pair"),
		[suggestions],
	);
	const fuzzySuggestions = useMemo(
		() => suggestions.filter((s) => s.matchType === "fuzzy"),
		[suggestions],
	);
	const noMatchWithAnnotation = useMemo(
		() =>
			suggestions.filter(
				(s) => s.matchType === "none" && s.annotation !== null,
			),
		[suggestions],
	);

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h3 className="font-semibold text-lg">イベントマッピング</h3>
				<p className="text-base-content/70 text-sm">
					CSVのイベント名を既存イベントにマッピングします
				</p>
			</div>

			{/* 自動マッピング済み（annotation_pair） */}
			{annotationPairs.length > 0 && (
				<div className="space-y-2">
					<h4 className="flex items-center gap-2 font-medium text-sm">
						<CheckCircle className="h-4 w-4 text-success" />
						自動マッピング済み
					</h4>
					<div className="collapse-arrow collapse border border-base-300 bg-base-200">
						<input type="checkbox" />
						<div className="collapse-title text-sm">
							{annotationPairs.length}件のイベントが自動マッピングされました
						</div>
						<div className="collapse-content space-y-1">
							{annotationPairs.map((s) => (
								<div
									key={s.csvEventName}
									className="flex items-center gap-2 rounded-lg bg-base-100 p-3 text-sm"
								>
									<CheckCircle className="h-4 w-4 shrink-0 text-success" />
									<span className="font-medium">{s.csvEventName}</span>
									<ArrowRight className="h-4 w-4 shrink-0 text-base-content/40" />
									<span className="text-success">
										{eventNameMappings[s.csvEventName] || s.suggestedEventName}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* ファジーマッチ候補（fuzzy） */}
			{fuzzySuggestions.length > 0 && (
				<div className="space-y-2">
					<h4 className="flex items-center gap-2 font-medium text-sm">
						<Search className="h-4 w-4 text-info" />
						マッチング候補（確認が必要）
					</h4>
					<div className="space-y-2">
						{fuzzySuggestions.map((s) => (
							<FuzzyMatchCard
								key={s.csvEventName}
								suggestion={s}
								currentMapping={eventNameMappings[s.csvEventName] || null}
								onMappingChange={onMappingChange}
							/>
						))}
					</div>
				</div>
			)}

			{/* マッチなし（annotationあり） */}
			{noMatchWithAnnotation.length > 0 && (
				<div className="space-y-2">
					<h4 className="flex items-center gap-2 font-medium text-sm">
						<AlertCircle className="h-4 w-4 text-warning" />
						マッチなし（操作が必要）
					</h4>
					<div className="space-y-2">
						{noMatchWithAnnotation.map((s) => (
							<NoMatchCard
								key={s.csvEventName}
								suggestion={s}
								currentMapping={eventNameMappings[s.csvEventName] || null}
								onMappingChange={onMappingChange}
							/>
						))}
					</div>
				</div>
			)}

			{annotationPairs.length === 0 &&
				fuzzySuggestions.length === 0 &&
				noMatchWithAnnotation.length === 0 && (
					<div className="flex flex-col items-center gap-2 py-8 text-success">
						<CheckCircle className="h-8 w-8" />
						<p className="text-sm">すべてのイベントが自動解決されました</p>
					</div>
				)}
		</div>
	);
}

// ファジーマッチカード
interface FuzzyMatchCardProps {
	suggestion: EventMatchSuggestion;
	currentMapping: string | null;
	onMappingChange: (csvName: string, resolvedName: string | null) => void;
}

function FuzzyMatchCard({
	suggestion,
	currentMapping,
	onMappingChange,
}: FuzzyMatchCardProps) {
	const isAccepted = currentMapping === suggestion.suggestedEventName;
	const isNewEvent = currentMapping === null;

	return (
		<div className="rounded-lg border border-base-300 bg-base-100 p-4">
			<div className="flex items-center gap-2">
				<Link2 className="h-4 w-4 text-info" />
				<span className="font-medium">{suggestion.csvEventName}</span>
			</div>
			<div className="mt-3 space-y-2 pl-6">
				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="radio"
						name={`fuzzy-${suggestion.csvEventName}`}
						className="radio radio-primary radio-sm"
						checked={isAccepted}
						onChange={() =>
							onMappingChange(
								suggestion.csvEventName,
								suggestion.suggestedEventName,
							)
						}
					/>
					<span className="text-sm">
						推奨: <strong>{suggestion.suggestedEventName}</strong>
						（既存イベント）
					</span>
				</label>
				{suggestion.allCandidates.length > 1 && (
					<div className="ml-6">
						<select
							className="select select-bordered select-sm w-full max-w-xs"
							value={isAccepted || isNewEvent ? "" : currentMapping || ""}
							onChange={(e) => {
								if (e.target.value) {
									onMappingChange(suggestion.csvEventName, e.target.value);
								}
							}}
						>
							<option value="">他のイベントを選択...</option>
							{suggestion.allCandidates
								.filter((c) => c.eventName !== suggestion.suggestedEventName)
								.map((c) => (
									<option key={c.eventId} value={c.eventName}>
										{c.eventName}
										{c.seriesName ? ` (${c.seriesName})` : ""}
									</option>
								))}
						</select>
					</div>
				)}
				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="radio"
						name={`fuzzy-${suggestion.csvEventName}`}
						className="radio radio-sm"
						checked={isNewEvent}
						onChange={() => onMappingChange(suggestion.csvEventName, null)}
					/>
					<span className="text-sm">新規イベントとして作成する</span>
				</label>
			</div>
		</div>
	);
}

// マッチなしカード（annotationあり）
interface NoMatchCardProps {
	suggestion: EventMatchSuggestion;
	currentMapping: string | null;
	onMappingChange: (csvName: string, resolvedName: string | null) => void;
}

function NoMatchCard({
	suggestion,
	currentMapping,
	onMappingChange,
}: NoMatchCardProps) {
	return (
		<div className="rounded-lg border border-base-300 bg-base-100 p-4">
			<div className="flex items-center gap-2">
				<AlertCircle className="h-4 w-4 text-warning" />
				<span className="font-medium">{suggestion.csvEventName}</span>
				{suggestion.annotation && (
					<span className="badge badge-warning badge-sm">
						{suggestion.annotation}
					</span>
				)}
			</div>
			<div className="mt-3 space-y-2 pl-6">
				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="radio"
						name={`nomatch-${suggestion.csvEventName}`}
						className="radio radio-primary radio-sm"
						checked={currentMapping === suggestion.strippedName}
						onChange={() =>
							onMappingChange(suggestion.csvEventName, suggestion.strippedName)
						}
					/>
					<span className="text-sm">
						サフィックスを除去して作成: 「
						<strong>{suggestion.strippedName}</strong>」
					</span>
				</label>
				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="radio"
						name={`nomatch-${suggestion.csvEventName}`}
						className="radio radio-sm"
						checked={currentMapping === null}
						onChange={() => onMappingChange(suggestion.csvEventName, null)}
					/>
					<span className="text-sm">
						そのまま作成: 「{suggestion.csvEventName}」
					</span>
				</label>
			</div>
		</div>
	);
}

// ステップ3: 原曲マッピング
interface MappingStepProps {
	records: LegacyCSVRecord[];
	songMatches: SongMatchResult[];
	mappings: Record<string, string>;
	customSongNames: Record<string, string>;
	onMappingChange: (originalName: string, selectedId: string | null) => void;
	onCustomSongNameChange: (originalName: string, customName: string) => void;
}

function MappingStep({
	records,
	songMatches,
	mappings,
	customSongNames,
	onMappingChange,
	onCustomSongNameChange,
}: MappingStepProps) {
	const mappedCount = Object.keys(mappings).length;
	const totalCount = songMatches.length;
	const unmappedCount = totalCount - mappedCount;

	const [hideMapped, setHideMapped] = useState(false);

	const filteredMatches = useMemo(() => {
		if (!hideMapped) return songMatches;
		return songMatches.filter(
			(match) => match.matchType === "none" || !mappings[match.originalName],
		);
	}, [hideMapped, songMatches, mappings]);

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h3 className="font-semibold text-lg">原曲マッピング</h3>
				<p className="text-base-content/70 text-sm">
					CSVの原曲名を公式楽曲データベースにマッピングしてください
				</p>
			</div>

			{/* 統計 */}
			<div className="stats w-full border border-base-300">
				<div className="stat">
					<div className="stat-title">レコード数</div>
					<div className="stat-value text-2xl">{records.length}</div>
				</div>
				<div className="stat">
					<div className="stat-title">ユニーク原曲数</div>
					<div className="stat-value text-2xl">{totalCount}</div>
				</div>
				<div className="stat">
					<div className="stat-title">マッピング済み</div>
					<div className="stat-value text-2xl text-success">{mappedCount}</div>
				</div>
				<div className="stat">
					<div className="stat-title">未マッピング</div>
					<div className="stat-value text-2xl text-warning">
						{unmappedCount}
					</div>
				</div>
			</div>

			{/* フィルター */}
			<div className="flex items-center justify-between">
				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						className="checkbox checkbox-sm"
						checked={hideMapped}
						onChange={(e) => setHideMapped(e.target.checked)}
					/>
					<span className="text-sm">未マッピングのみ表示</span>
				</label>
				{hideMapped && (
					<span className="text-base-content/70 text-sm">
						表示中: {filteredMatches.length}件 / 全{totalCount}件
					</span>
				)}
			</div>

			{/* マッピングリスト */}
			<div className="space-y-2">
				{filteredMatches.length === 0 && hideMapped ? (
					<div className="flex flex-col items-center gap-2 py-8 text-success">
						<CheckCircle className="h-8 w-8" />
						<p className="text-sm">すべての原曲がマッピング済みです</p>
					</div>
				) : (
					filteredMatches.map((match) => (
						<SongMappingRow
							key={match.originalName}
							match={match}
							selectedId={mappings[match.originalName] || null}
							customSongName={customSongNames[match.originalName] || null}
							onSelect={(id) => onMappingChange(match.originalName, id)}
							onCustomSongNameChange={(name) =>
								onCustomSongNameChange(match.originalName, name)
							}
						/>
					))
				)}
			</div>
		</div>
	);
}

// 原曲マッピング行
interface SongMappingRowProps {
	match: SongMatchResult;
	selectedId: string | null;
	customSongName: string | null;
	onSelect: (id: string | null) => void;
	onCustomSongNameChange: (name: string) => void;
}

function SongMappingRow({
	match,
	selectedId,
	customSongName,
	onSelect,
	onCustomSongNameChange,
}: SongMappingRowProps) {
	const getStatusBadge = () => {
		if (match.matchType === "none") {
			return <span className="badge badge-neutral badge-sm">その他に登録</span>;
		}
		if (selectedId) {
			return <span className="badge badge-success badge-sm">マッピング済</span>;
		}
		if (match.matchType === "exact") {
			return <span className="badge badge-info badge-sm">完全一致</span>;
		}
		if (match.matchType === "normalized") {
			return <span className="badge badge-warning badge-sm">正規化一致</span>;
		}
		if (match.matchType === "partial") {
			return <span className="badge badge-warning badge-sm">部分一致</span>;
		}
		return <span className="badge badge-error badge-sm">マッチなし</span>;
	};

	return (
		<div className="flex items-center gap-4 rounded-lg border border-base-300 bg-base-100 p-4">
			<div className="flex-1">
				<div className="flex items-center gap-2">
					<Music className="h-4 w-4 text-base-content/40" />
					<span className="font-medium">{match.originalName}</span>
					{getStatusBadge()}
				</div>
			</div>

			<div className="flex-1">
				{match.matchType === "none" ? (
					<input
						type="text"
						className="input input-bordered input-sm w-full"
						placeholder="カスタム曲名を入力"
						value={customSongName || ""}
						onChange={(e) => onCustomSongNameChange(e.target.value)}
					/>
				) : match.candidates.length > 0 ? (
					<select
						className="select select-bordered select-sm w-full"
						value={selectedId || ""}
						onChange={(e) => onSelect(e.target.value || null)}
					>
						<option value="">選択してください</option>
						{match.candidates.map((candidate) => (
							<option key={candidate.id} value={candidate.id}>
								{candidate.name}
								{candidate.officialWorkName
									? ` (${candidate.officialWorkName})`
									: ""}
							</option>
						))}
					</select>
				) : (
					<span className="text-base-content/40 text-sm">
						候補が見つかりません
					</span>
				)}
			</div>
		</div>
	);
}

// ステップ2: イベント登録
interface EventRegistrationStepProps {
	events: NewEventNeeded[];
	eventInputs: Record<string, NewEventInput>;
	onEventInputChange: (
		eventName: string,
		input: Partial<NewEventInput>,
	) => void;
	existingEventsWithDays: ExistingEventWithDays[];
	eventDayMappings: Record<string, string>;
	onEventDayChange: (eventName: string, eventDayId: string) => void;
}

function EventRegistrationStep({
	events,
	eventInputs,
	onEventInputChange,
	existingEventsWithDays,
	eventDayMappings,
	onEventDayChange,
}: EventRegistrationStepProps) {
	const [pendingNewSeries, setPendingNewSeries] = useState<string[]>([]);

	const { data: seriesData, isLoading: isSeriesLoading } = useQuery({
		queryKey: ["eventSeries"],
		queryFn: () => eventSeriesApi.list(),
	});

	const seriesList: EventSeriesType[] = useMemo(
		() => seriesData?.data.map((s) => ({ id: s.id, name: s.name })) ?? [],
		[seriesData],
	);

	const seriesOptions = useMemo(() => {
		const options = seriesList.map((s) => ({
			value: s.id,
			label: s.name,
		}));
		for (const name of pendingNewSeries) {
			options.push({ value: `new:${name}`, label: `${name} (新規)` });
		}
		return options;
	}, [seriesList, pendingNewSeries]);

	const handleCreateNewSeries = useCallback(
		(name: string, eventName: string) => {
			setPendingNewSeries((prev) =>
				prev.includes(name) ? prev : [...prev, name],
			);
			onEventInputChange(eventName, {
				eventSeriesId: null,
				eventSeriesName: name,
			});
		},
		[onEventInputChange],
	);

	return (
		<div className="space-y-6">
			{/* 既存イベントのイベント日選択 */}
			{existingEventsWithDays.length > 0 && (
				<div className="space-y-4">
					<div className="text-center">
						<h3 className="font-semibold text-lg">イベント日の選択</h3>
						<p className="text-base-content/70 text-sm">
							以下のイベントは複数日開催されています。作品を紐付ける日を選択してください
						</p>
					</div>
					{existingEventsWithDays.map((event) => (
						<div
							key={event.eventId}
							className="card border border-base-300 bg-base-200 p-4"
						>
							<h4 className="mb-3 font-medium">{event.eventName}</h4>
							<div className="flex flex-wrap gap-4">
								{event.eventDays.map((day) => (
									<label
										key={day.id}
										className="flex cursor-pointer items-center gap-2"
									>
										<input
											type="radio"
											name={`eventDay-${event.eventId}`}
											value={day.id}
											checked={eventDayMappings[event.eventName] === day.id}
											onChange={() => onEventDayChange(event.eventName, day.id)}
											className="radio radio-primary radio-sm"
										/>
										<span>
											{day.dayNumber}日目
											{day.eventDate && (
												<span className="ml-1 text-base-content/70 text-sm">
													({day.eventDate})
												</span>
											)}
										</span>
									</label>
								))}
							</div>
						</div>
					))}
				</div>
			)}

			{/* 新規イベント登録 */}
			{events.length > 0 && (
				<div className="space-y-4">
					<div className="text-center">
						<h3 className="font-semibold text-lg">新規イベント登録</h3>
						<p className="text-base-content/70 text-sm">
							以下のイベントはデータベースに存在しないため、情報を入力してください
						</p>
					</div>

					<div className="space-y-4">
						{events.map((event) => (
							<EventInputCard
								key={event.name}
								event={event}
								input={eventInputs[event.name]}
								onChange={(input) => onEventInputChange(event.name, input)}
								seriesList={seriesList}
								seriesOptions={seriesOptions}
								onCreateNewSeries={(name) =>
									handleCreateNewSeries(name, event.name)
								}
								isSeriesLoading={isSeriesLoading}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

// イベント入力カード
interface EventInputCardProps {
	event: NewEventNeeded;
	input: NewEventInput | undefined;
	onChange: (input: Partial<NewEventInput>) => void;
	seriesList: EventSeriesType[];
	seriesOptions: { value: string; label: string }[];
	onCreateNewSeries: (name: string) => void;
	isSeriesLoading?: boolean;
}

function EventInputCard({
	event,
	input,
	onChange,
	seriesList,
	seriesOptions,
	onCreateNewSeries,
	isSeriesLoading,
}: EventInputCardProps) {
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [newSeriesName, setNewSeriesName] = useState("");
	const modalRef = useRef<HTMLDialogElement>(null);
	const stableId = useId();

	const suggestion = useMemo(
		() => suggestFromEventName(event.name, seriesList),
		[event.name, seriesList],
	);

	const selectValue = input?.eventSeriesName
		? `new:${input.eventSeriesName}`
		: input?.eventSeriesId || "";

	const isAutoSuggested =
		!!input?.eventSeriesId &&
		!input?.eventSeriesName &&
		suggestion.seriesId === input.eventSeriesId;

	const handleSeriesChange = useCallback(
		(value: string) => {
			if (value.startsWith("new:")) {
				onChange({
					eventSeriesId: null,
					eventSeriesName: value.slice(4),
				});
			} else if (value) {
				onChange({ eventSeriesId: value, eventSeriesName: null });
			} else {
				onChange({ eventSeriesId: null, eventSeriesName: null });
			}
		},
		[onChange],
	);

	const handleOpenCreateModal = useCallback(() => {
		setNewSeriesName(extractSeriesName(event.name));
		setShowCreateModal(true);
		setTimeout(() => modalRef.current?.showModal(), 0);
	}, [event.name]);

	const handleCloseCreateModal = useCallback(() => {
		setShowCreateModal(false);
		modalRef.current?.close();
	}, []);

	const handleSubmitNewSeries = useCallback(() => {
		const trimmed = newSeriesName.trim();
		if (!trimmed) return;
		onCreateNewSeries(trimmed);
		setShowCreateModal(false);
		modalRef.current?.close();
	}, [newSeriesName, onCreateNewSeries]);

	const handleTotalDaysChange = useCallback(
		(totalDays: number) => {
			const eventDates = Array(totalDays).fill("");
			onChange({ totalDays, eventDates });
		},
		[onChange],
	);

	const handleStartDateChange = useCallback(
		(startDate: string) => {
			// 開催日数が1の場合は終了日も同じ値に
			if (input?.totalDays === 1) {
				const eventDates = [startDate];
				onChange({ startDate, endDate: startDate, eventDates });
			} else {
				onChange({ startDate });
			}
		},
		[input?.totalDays, onChange],
	);

	const handleEventDateChange = useCallback(
		(index: number, date: string) => {
			const newEventDates = [...(input?.eventDates || [])];
			newEventDates[index] = date;

			// 開始日・終了日を自動設定
			const filledDates = newEventDates.filter((d) => d !== "");
			if (filledDates.length > 0) {
				const sortedDates = [...filledDates].sort();
				onChange({
					eventDates: newEventDates,
					startDate: sortedDates[0],
					endDate: sortedDates[sortedDates.length - 1],
				});
			} else {
				onChange({ eventDates: newEventDates });
			}
		},
		[input?.eventDates, onChange],
	);

	return (
		<div className="card border border-base-300 bg-base-100">
			<div className="card-body">
				<div className="flex items-center gap-2">
					<Calendar className="h-4 w-4 text-primary" />
					<h4 className="card-title text-lg">{event.name}</h4>
					{event.edition && (
						<span className="badge badge-primary">第{event.edition}回</span>
					)}
				</div>

				{/* イベントシリーズ選択 */}
				<div className="grid gap-2">
					<Label htmlFor={`${stableId}-series`}>イベントシリーズ</Label>
					<div className="flex items-center gap-3">
						<div className="w-full max-w-md">
							<SearchableSelect
								id={`${stableId}-series`}
								value={selectValue}
								onChange={handleSeriesChange}
								options={seriesOptions}
								placeholder={
									isSeriesLoading
										? "シリーズを読み込み中..."
										: "シリーズを選択..."
								}
								searchPlaceholder="シリーズ名で検索..."
								emptyMessage="シリーズが見つかりません"
								disabled={isSeriesLoading}
							/>
						</div>
						<button
							type="button"
							className="btn btn-ghost btn-sm shrink-0 gap-1"
							onClick={handleOpenCreateModal}
						>
							<Plus className="h-3.5 w-3.5" />
							新規シリーズ作成
						</button>
					</div>
					{isAutoSuggested && (
						<p className="mt-1 flex items-center gap-1 text-info text-xs">
							<Info className="h-3 w-3 shrink-0" />
							イベント名から自動推察しました
						</p>
					)}
					{input?.eventSeriesName && (
						<p className="mt-1 flex items-center gap-1 text-success text-xs">
							<Sparkles className="h-3 w-3 shrink-0" />
							新規シリーズ「{input.eventSeriesName}」をインポート時に作成します
						</p>
					)}
				</div>

				<div className="mt-1 grid grid-cols-1 gap-4 md:grid-cols-3">
					{/* 開催日数 */}
					<div className="grid gap-2">
						<Label htmlFor={`${stableId}-total-days`}>開催日数</Label>
						<select
							id={`${stableId}-total-days`}
							className="select select-bordered"
							value={input?.totalDays || 1}
							onChange={(e) =>
								handleTotalDaysChange(Number.parseInt(e.target.value, 10))
							}
						>
							{[1, 2, 3, 4, 5].map((days) => (
								<option key={days} value={days}>
									{days}日
								</option>
							))}
						</select>
					</div>

					{/* 開始日 */}
					<div className="grid gap-2">
						<Label htmlFor={`${stableId}-start-date`}>開始日</Label>
						<input
							id={`${stableId}-start-date`}
							type="date"
							className="input input-bordered"
							value={input?.startDate || ""}
							onChange={(e) => handleStartDateChange(e.target.value)}
						/>
					</div>

					{/* 終了日 */}
					<div className="grid gap-2">
						<Label htmlFor={`${stableId}-end-date`}>終了日</Label>
						<input
							id={`${stableId}-end-date`}
							type="date"
							className="input input-bordered"
							value={input?.endDate || ""}
							onChange={(e) => onChange({ endDate: e.target.value })}
							disabled={input?.totalDays === 1}
						/>
					</div>
				</div>

				{/* 各日の日付 */}
				{(input?.totalDays || 1) > 1 && (
					<div className="mt-4">
						<h5 className="mb-2 font-medium text-sm">開催日</h5>
						<div className="grid grid-cols-2 gap-2 md:grid-cols-5">
							{Array.from({ length: input?.totalDays || 1 }).map((_, i) => (
								<div key={`day-${event.name}-${i}`} className="grid gap-1">
									<Label htmlFor={`${stableId}-date-${i}`}>{i + 1}日目</Label>
									<input
										id={`${stableId}-date-${i}`}
										type="date"
										className="input input-bordered input-sm"
										value={input?.eventDates?.[i] || ""}
										onChange={(e) => handleEventDateChange(i, e.target.value)}
									/>
								</div>
							))}
						</div>
					</div>
				)}

				{/* 新規シリーズ作成モーダル */}
				{showCreateModal && (
					<dialog ref={modalRef} className="modal">
						<div className="modal-box">
							<h3 className="font-bold text-lg">新規イベントシリーズ作成</h3>
							<div className="mt-4 grid gap-2">
								<Label htmlFor={`${stableId}-new-series-name`}>
									シリーズ名
								</Label>
								<input
									id={`${stableId}-new-series-name`}
									type="text"
									className="input input-bordered"
									value={newSeriesName}
									onChange={(e) => setNewSeriesName(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											handleSubmitNewSeries();
										}
									}}
									placeholder="例: 博麗神社例大祭"
									autoComplete="off"
									data-1p-ignore
									data-lpignore="true"
									data-form-type="other"
								/>
							</div>
							<div className="modal-action">
								<button
									type="button"
									className="btn"
									onClick={handleCloseCreateModal}
								>
									キャンセル
								</button>
								<button
									type="button"
									className="btn btn-primary"
									onClick={handleSubmitNewSeries}
									disabled={!newSeriesName.trim()}
								>
									作成
								</button>
							</div>
						</div>
						<div className="modal-backdrop" aria-hidden="true">
							<button
								type="button"
								tabIndex={-1}
								onClick={handleCloseCreateModal}
								aria-label="閉じる"
							>
								close
							</button>
						</div>
					</dialog>
				)}
			</div>
		</div>
	);
}

// ステップ4: インポート中
interface ImportingStepProps {
	stage: ImportStage;
	progress: number;
	entityProgress: EntityProgressMap | null;
}

function ImportingStep({
	stage,
	progress,
	entityProgress,
}: ImportingStepProps) {
	// エンティティタイプのラベルマップ
	const entityLabels: Record<keyof EntityProgressMap, string> = {
		events: "イベント",
		circles: "サークル",
		artists: "アーティスト",
		releases: "作品",
		tracks: "トラック",
	};

	// ステージとエンティティの対応
	const stageToEntity: Partial<Record<ImportStage, keyof EntityProgressMap>> = {
		events: "events",
		circles: "circles",
		artists: "artists",
		releases: "releases",
		tracks: "tracks",
	};

	const stageInfo: Record<
		ImportStage,
		{ label: string; icon: React.ReactNode }
	> = {
		preparing: {
			label: "準備中",
			icon: <Loader2 className="h-4 w-4 animate-spin" />,
		},
		events: {
			label: "イベント",
			icon: <Calendar className="h-4 w-4" />,
		},
		circles: {
			label: "サークル",
			icon: <CheckCircle className="h-4 w-4" />,
		},
		artists: {
			label: "アーティスト",
			icon: <CheckCircle className="h-4 w-4" />,
		},
		releases: {
			label: "作品",
			icon: <CheckCircle className="h-4 w-4" />,
		},
		tracks: {
			label: "トラック",
			icon: <Music className="h-4 w-4" />,
		},
		credits: {
			label: "クレジット",
			icon: <CheckCircle className="h-4 w-4" />,
		},
		links: {
			label: "原曲紐付け",
			icon: <CheckCircle className="h-4 w-4" />,
		},
		search_sync: {
			label: "検索インデックス同期",
			icon: <Search className="h-4 w-4" />,
		},
		complete: {
			label: "完了",
			icon: <CheckCircle className="h-4 w-4 text-success" />,
		},
	};

	const stages: ImportStage[] = [
		"events",
		"circles",
		"artists",
		"releases",
		"tracks",
		"credits",
		"links",
		"search_sync",
	];

	const isComplete = stage === "complete";

	// エンティティの進捗テキストを生成
	const getEntityProgressText = (
		entityKey: keyof EntityProgressMap,
	): string => {
		if (!entityProgress) return "";
		const ep = entityProgress[entityKey];
		if (!ep || ep.total === 0) return "";
		return `${ep.processed}/${ep.total}件`;
	};

	// 現在のステージのメッセージを生成
	const getCurrentMessage = (): string => {
		if (stage === "preparing") return "インポートの準備をしています...";
		if (stage === "complete") return "インポートが完了しました";
		if (stage === "credits") return "クレジット情報を登録しています...";
		if (stage === "links") return "原曲との紐付けを登録しています...";
		if (stage === "search_sync") return "検索インデックスを同期しています...";

		const entityKey = stageToEntity[stage];
		if (entityKey && entityProgress) {
			const ep = entityProgress[entityKey];
			if (ep && ep.total > 0) {
				const label = entityLabels[entityKey];
				return `${label}: ${ep.processed}/${ep.total}件 処理中...`;
			}
		}
		return `${stageInfo[stage].label}情報を登録しています...`;
	};

	return (
		<div className="space-y-8">
			<div className="text-center">
				<div className="flex items-center justify-center gap-2">
					{isComplete ? (
						<CheckCircle className="h-8 w-8 text-success" />
					) : (
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					)}
				</div>
				<h3 className="mt-4 font-semibold text-lg">
					{isComplete ? "インポート完了" : "インポート実行中"}
				</h3>
				<p className="text-base-content/70 text-sm">
					{isComplete
						? "結果画面に移動します..."
						: "データベースにレコードを登録しています。しばらくお待ちください..."}
				</p>
			</div>

			{/* プログレスバー */}
			<div className="space-y-2">
				<div className="flex items-center justify-between text-sm">
					<span className="flex items-center gap-2">
						{stageInfo[stage].icon}
						<span>{getCurrentMessage()}</span>
					</span>
					<span className="font-medium">{progress}%</span>
				</div>
				<progress
					className="progress progress-primary w-full"
					value={progress}
					max="100"
				/>
			</div>

			{/* エンティティ別進捗 */}
			{entityProgress && (
				<div className="stats stats-vertical lg:stats-horizontal w-full border border-base-300">
					{(
						Object.entries(entityLabels) as [keyof EntityProgressMap, string][]
					).map(([key, label]) => {
						const ep = entityProgress[key];
						const isCurrentEntity = stageToEntity[stage] === key;
						const isDone = ep.processed === ep.total && ep.total > 0;

						return (
							<div
								key={key}
								className={`stat ${isCurrentEntity ? "bg-primary/5" : ""}`}
							>
								<div className="stat-title">{label}</div>
								<div
									className={`stat-value text-xl ${isDone ? "text-success" : isCurrentEntity ? "text-primary" : ""}`}
								>
									{ep.processed}/{ep.total}
								</div>
								<div className="stat-desc">
									{isDone ? (
										<span className="text-success">完了</span>
									) : isCurrentEntity ? (
										<span className="text-primary">処理中...</span>
									) : ep.processed > 0 ? (
										<span>処理済み</span>
									) : (
										<span>待機中</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* ステージリスト */}
			<div className="space-y-2">
				<h4 className="font-medium text-sm">処理ステージ</h4>
				<ul className="space-y-1">
					{stages.map((s) => {
						const info = stageInfo[s];
						const stageCompleted =
							stages.indexOf(s) < stages.indexOf(stage) || stage === "complete";
						const isCurrent = s === stage;
						const entityKey = stageToEntity[s];
						const progressText = entityKey
							? getEntityProgressText(entityKey)
							: "";

						return (
							<li
								key={s}
								className={`flex items-center justify-between rounded-lg p-4 text-sm ${
									isCurrent
										? "bg-primary text-primary-content"
										: stageCompleted
											? "text-success"
											: "text-base-content/40"
								}`}
							>
								<span className="flex items-center gap-2">
									{stageCompleted ? (
										<CheckCircle className="h-4 w-4" />
									) : isCurrent ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<span className="block h-4 w-4 rounded-full border border-current" />
									)}
									<span>{info.label}</span>
								</span>
								{progressText && (
									<span className="font-medium">{progressText}</span>
								)}
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}

// ステップ5: インポート結果
interface ResultStepProps {
	result: LegacyImportResult;
	onReset: () => void;
}

function ResultStep({ result, onReset }: ResultStepProps) {
	const entityNames: Record<string, string> = {
		events: "イベント",
		eventDays: "イベント開催日",
		circles: "サークル",
		artists: "アーティスト",
		artistAliases: "アーティスト名義",
		releases: "作品",
		discs: "ディスク",
		tracks: "トラック",
		credits: "クレジット",
		officialSongLinks: "原曲紐付け",
	};

	return (
		<div className="space-y-6">
			<div className="text-center">
				{result.success ? (
					<>
						<CheckCircle className="mx-auto h-16 w-16 text-success" />
						<h3 className="mt-4 font-semibold text-lg">
							インポートが完了しました
						</h3>
					</>
				) : (
					<>
						<XCircle className="mx-auto h-16 w-16 text-error" />
						<h3 className="mt-4 font-semibold text-lg">
							インポート中にエラーが発生しました
						</h3>
					</>
				)}
			</div>

			{/* 結果サマリー */}
			<div className="overflow-x-auto">
				<table className="table">
					<thead>
						<tr>
							<th>エンティティ</th>
							<th className="text-right">作成</th>
							<th className="text-right">更新</th>
							<th className="text-right">スキップ</th>
						</tr>
					</thead>
					<tbody>
						{Object.entries(entityNames).map(([key, name]) => {
							const counts = result[key as keyof typeof result] as {
								created: number;
								updated: number;
								skipped: number;
							};
							if (!counts) return null;
							return (
								<tr key={key}>
									<td>{name}</td>
									<td className="text-right text-success">
										{counts.created > 0 && `+${counts.created}`}
									</td>
									<td className="text-right text-info">
										{counts.updated > 0 && `${counts.updated}`}
									</td>
									<td className="text-right text-base-content/40">
										{counts.skipped > 0 && counts.skipped}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* エラー詳細 */}
			{result.errors.length > 0 && (
				<div className="alert alert-warning">
					<AlertCircle className="h-4 w-4" />
					<div>
						<h4 className="font-semibold">警告</h4>
						<ul className="list-disc pl-4 text-sm">
							{result.errors.map((error) => (
								<li key={`${error.row}-${error.entity}-${error.message}`}>
									行 {error.row} ({error.entity}): {error.message}
								</li>
							))}
						</ul>
					</div>
				</div>
			)}

			{/* アクションボタン */}
			<div className="flex justify-center gap-4">
				<button type="button" className="btn btn-primary" onClick={onReset}>
					新しいインポートを開始
				</button>
				<Link to="/admin/releases" className="btn btn-ghost">
					作品一覧へ
				</Link>
			</div>
		</div>
	);
}

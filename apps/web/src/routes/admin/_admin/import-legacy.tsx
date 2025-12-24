/**
 * レガシーCSVインポートページ
 *
 * 4ステップウィザード:
 * 1. CSVアップロード
 * 2. 原曲マッピング
 * 3. イベント登録（新規イベントがある場合のみ）
 * 4. インポート結果
 */
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	Calendar,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	FileUp,
	Loader2,
	Music,
	Upload,
	XCircle,
} from "lucide-react";
import { useCallback, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
	type LegacyCSVRecord,
	type LegacyImportResult,
	legacyImportApi,
	type NewEventInput,
	type NewEventNeeded,
	type SongMatchResult,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/import-legacy")({
	head: () => createPageHead("レガシーCSVインポート"),
	component: LegacyImportPage,
});

type WizardStep = "upload" | "mapping" | "events" | "result";

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
	const [parseErrors, setParseErrors] = useState<
		{ row: number; message: string }[]
	>([]);
	const [importResult, setImportResult] = useState<LegacyImportResult | null>(
		null,
	);

	// プレビューAPI
	const previewMutation = useMutation({
		mutationFn: legacyImportApi.preview,
		onSuccess: (data) => {
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

				// 新規イベントのデフォルト値を設定
				const defaultEventInputs: Record<string, NewEventInput> = {};
				for (const event of data.newEventsNeeded) {
					defaultEventInputs[event.name] = {
						name: event.name,
						totalDays: 1,
						startDate: "",
						endDate: "",
						eventDates: [""],
					};
				}
				setNewEventInputs(defaultEventInputs);

				setStep("mapping");
			} else {
				setParseErrors(data.errors);
			}
		},
	});

	// 実行API
	const executeMutation = useMutation({
		mutationFn: () => {
			const newEvents =
				newEventsNeeded.length > 0
					? Object.values(newEventInputs).filter((e) => e.startDate !== "")
					: undefined;
			return legacyImportApi.execute(
				records,
				mappings,
				customSongNames,
				newEvents,
			);
		},
		onSuccess: (data) => {
			setImportResult(data);
			setStep("result");
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

	// 次へハンドラ
	const handleNext = useCallback(() => {
		if (step === "mapping") {
			if (newEventsNeeded.length > 0) {
				setStep("events");
			} else {
				executeMutation.mutate();
			}
		} else if (step === "events") {
			executeMutation.mutate();
		}
	}, [step, newEventsNeeded.length, executeMutation]);

	// 戻るハンドラ
	const handleBack = useCallback(() => {
		if (step === "mapping") {
			setStep("upload");
		} else if (step === "events") {
			setStep("mapping");
		}
	}, [step]);

	// リセットハンドラ
	const handleReset = useCallback(() => {
		setStep("upload");
		setRecords([]);
		setSongMatches([]);
		setNewEventsNeeded([]);
		setMappings({});
		setCustomSongNames({});
		setNewEventInputs({});
		setParseErrors([]);
		setImportResult(null);
	}, []);

	// イベントステップをスキップするかどうか
	const skipEventsStep = newEventsNeeded.length === 0;

	return (
		<div className="container mx-auto py-6">
			<AdminPageHeader
				title="レガシーCSVインポート"
				description="旧システムのCSVデータをインポートします"
			/>

			{/* ステップインジケーター */}
			<div className="mb-8">
				<ul className="steps w-full">
					<li
						className={`step ${step === "upload" || step === "mapping" || step === "events" || step === "result" ? "step-primary" : ""}`}
					>
						CSVアップロード
					</li>
					<li
						className={`step ${step === "mapping" || step === "events" || step === "result" ? "step-primary" : ""}`}
					>
						原曲マッピング
					</li>
					{!skipEventsStep && (
						<li
							className={`step ${step === "events" || step === "result" ? "step-primary" : ""}`}
						>
							イベント登録
						</li>
					)}
					<li className={`step ${step === "result" ? "step-primary" : ""}`}>
						インポート結果
					</li>
				</ul>
			</div>

			{/* ステップコンテンツ */}
			<div className="card border border-base-300 bg-base-100 shadow-sm">
				<div className="card-body">
					{step === "upload" && (
						<UploadStep
							onUpload={handleFileUpload}
							isLoading={previewMutation.isPending}
							errors={parseErrors}
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

					{step === "events" && (
						<EventRegistrationStep
							events={newEventsNeeded}
							eventInputs={newEventInputs}
							onEventInputChange={handleEventInputChange}
						/>
					)}

					{step === "result" && importResult && (
						<ResultStep result={importResult} onReset={handleReset} />
					)}
				</div>

				{/* ナビゲーションボタン */}
				{step !== "result" && (
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

						{(step === "mapping" || step === "events") && (
							<button
								type="button"
								className="btn btn-primary"
								onClick={handleNext}
								disabled={executeMutation.isPending}
							>
								{executeMutation.isPending ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										インポート中...
									</>
								) : step === "mapping" && !skipEventsStep ? (
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
				<p className="text-base-content/60 text-sm">
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
						<p className="mt-4 text-base-content/60">
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
					<AlertCircle className="h-5 w-5" />
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

// ステップ2: 原曲マッピング
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

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h3 className="font-semibold text-lg">原曲マッピング</h3>
				<p className="text-base-content/60 text-sm">
					CSVの原曲名を公式楽曲データベースにマッピングしてください
				</p>
			</div>

			{/* 統計 */}
			<div className="stats w-full border border-base-300 shadow-sm">
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

			{/* マッピングリスト */}
			<div className="space-y-2">
				{songMatches.map((match) => (
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
				))}
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
		if (match.matchType === "partial") {
			return <span className="badge badge-warning badge-sm">部分一致</span>;
		}
		return <span className="badge badge-error badge-sm">マッチなし</span>;
	};

	return (
		<div className="flex items-center gap-4 rounded-lg border border-base-300 bg-base-100 p-3">
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

// ステップ3: イベント登録
interface EventRegistrationStepProps {
	events: NewEventNeeded[];
	eventInputs: Record<string, NewEventInput>;
	onEventInputChange: (
		eventName: string,
		input: Partial<NewEventInput>,
	) => void;
}

function EventRegistrationStep({
	events,
	eventInputs,
	onEventInputChange,
}: EventRegistrationStepProps) {
	return (
		<div className="space-y-6">
			<div className="text-center">
				<h3 className="font-semibold text-lg">新規イベント登録</h3>
				<p className="text-base-content/60 text-sm">
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
					/>
				))}
			</div>
		</div>
	);
}

// イベント入力カード
interface EventInputCardProps {
	event: NewEventNeeded;
	input: NewEventInput | undefined;
	onChange: (input: Partial<NewEventInput>) => void;
}

function EventInputCard({ event, input, onChange }: EventInputCardProps) {
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
					<Calendar className="h-5 w-5 text-primary" />
					<h4 className="card-title text-lg">{event.name}</h4>
					{event.edition && (
						<span className="badge badge-primary">第{event.edition}回</span>
					)}
				</div>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{/* 開催日数 */}
					<div className="form-control">
						<label className="label">
							<span className="label-text">開催日数</span>
						</label>
						<select
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
					<div className="form-control">
						<label className="label">
							<span className="label-text">開始日</span>
						</label>
						<input
							type="date"
							className="input input-bordered"
							value={input?.startDate || ""}
							onChange={(e) => handleStartDateChange(e.target.value)}
						/>
					</div>

					{/* 終了日 */}
					<div className="form-control">
						<label className="label">
							<span className="label-text">終了日</span>
						</label>
						<input
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
								<div key={`day-${event.name}-${i}`} className="form-control">
									<label className="label">
										<span className="label-text">{i + 1}日目</span>
									</label>
									<input
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
			</div>
		</div>
	);
}

// ステップ4: インポート結果
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
		releases: "リリース",
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
					<AlertCircle className="h-5 w-5" />
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
					リリース一覧へ
				</Link>
			</div>
		</div>
	);
}

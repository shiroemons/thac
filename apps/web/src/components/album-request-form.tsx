import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { referenceUrlsSchema } from "@thac/db/schema/album-request.validation";
import { useState } from "react";
import { ReferenceUrlListInput } from "@/components/album-request/reference-url-list-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useDebounce } from "@/hooks/use-debounce";
import { releasesApi } from "@/lib/api-client";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

function validateReferenceUrls(
	urls: { url: string; label?: string }[],
): string | null {
	const filled = urls.filter((r) => r.url.trim());
	const result = referenceUrlsSchema.safeParse(filled);
	if (!result.success) {
		return result.error.issues[0]?.message ?? "無効なURL";
	}
	return null;
}

type RequestType = "new" | "existing";

interface ReferenceUrl {
	url: string;
	label?: string;
}

interface AlbumRequestPayload {
	requestType: RequestType;
	existingReleaseId?: string;
	albumName?: string;
	circleName?: string;
	referenceUrls: ReferenceUrl[];
	notes?: string;
}

interface AlbumRequestFormProps {
	onSubmit: (payload: AlbumRequestPayload) => Promise<void>;
	isSubmitting?: boolean;
}

export function AlbumRequestForm({
	onSubmit,
	isSubmitting = false,
}: AlbumRequestFormProps) {
	const [releaseSearch, setReleaseSearch] = useState("");
	const debouncedSearch = useDebounce(releaseSearch, 300);

	const { data: releasesData } = useQuery({
		queryKey: ["releases-search", debouncedSearch],
		queryFn: () => releasesApi.list({ search: debouncedSearch, limit: 20 }),
		enabled: debouncedSearch.length >= 2,
		staleTime: 30_000,
	});

	const releaseOptions = (releasesData?.data ?? []).map((r) => ({
		value: r.id,
		label: r.nameJa || r.name,
	}));

	const form = useForm({
		defaultValues: {
			requestType: "new" as RequestType,
			existingReleaseId: "",
			albumName: "",
			circleName: "",
			referenceUrls: [{ url: "", label: "" }] as ReferenceUrl[],
			notes: "",
		},
		onSubmit: async ({ value }) => {
			const filteredUrls = value.referenceUrls.filter((r) => r.url.trim());

			if (value.requestType === "existing") {
				await onSubmit({
					requestType: "existing",
					existingReleaseId: value.existingReleaseId || undefined,
					albumName: value.albumName || undefined,
					circleName: value.circleName || undefined,
					referenceUrls: filteredUrls,
					notes: value.notes || undefined,
				});
			} else {
				await onSubmit({
					requestType: "new",
					albumName: value.albumName || undefined,
					circleName: value.circleName || undefined,
					referenceUrls: filteredUrls,
					notes: value.notes || undefined,
				});
			}
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-6"
		>
			{/* リクエスト種別 */}
			<form.Field name="requestType">
				{(field) => (
					<div className="space-y-2">
						<Label>リクエスト種別 *</Label>
						<div className="flex gap-4">
							<label className="flex cursor-pointer items-center gap-2">
								<input
									type="radio"
									className="radio"
									name={field.name}
									value="new"
									checked={field.state.value === "new"}
									onChange={() => field.handleChange("new")}
								/>
								<span>新規アルバム</span>
							</label>
							<label className="flex cursor-pointer items-center gap-2">
								<input
									type="radio"
									className="radio"
									name={field.name}
									value="existing"
									checked={field.state.value === "existing"}
									onChange={() => field.handleChange("existing")}
								/>
								<span>既存アルバムへの追記</span>
							</label>
						</div>
					</div>
				)}
			</form.Field>

			{/* 既存アルバム選択 (requestType === "existing" のときのみ) */}
			<form.Subscribe selector={(state) => state.values.requestType}>
				{(requestType) =>
					requestType === "existing" && (
						<form.Field
							name="existingReleaseId"
							validators={{
								onChange: ({ value }) =>
									!value ? "既存アルバムを選択してください" : undefined,
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>既存アルバム *</Label>
									<SearchableSelect
										id={field.name}
										value={field.state.value}
										onChange={(value) => field.handleChange(value)}
										options={releaseOptions}
										placeholder="アルバムを検索して選択"
										searchPlaceholder="2文字以上入力して検索..."
										emptyMessage={
											debouncedSearch.length < 2
												? "2文字以上入力して検索"
												: "該当なし"
										}
										onSearchChange={setReleaseSearch}
									/>
									<p className="text-base-content/50 text-xs">
										2文字以上入力すると既存アルバムを検索できます
									</p>
									{field.state.meta.errors.map((error) => (
										<p key={String(error)} className="text-error text-sm">
											{String(error)}
										</p>
									))}
								</div>
							)}
						</form.Field>
					)
				}
			</form.Subscribe>

			{/* アルバム名 */}
			<form.Subscribe selector={(state) => state.values.requestType}>
				{(requestType) => (
					<form.Field
						name="albumName"
						validators={{
							onChange: ({ value }) => {
								if (requestType === "new" && !value.trim()) {
									return "アルバム名は必須です";
								}
								if (value.length > 200) {
									return "アルバム名は200文字以内で入力してください";
								}
								return undefined;
							},
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>
									アルバム名
									{requestType === "new" ? " *" : " (任意)"}
								</Label>
								<input
									id={field.name}
									name={field.name}
									type="text"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="アルバム名を入力"
									className="input w-full"
									autoComplete="off"
									data-1p-ignore
									data-lpignore="true"
									data-form-type="other"
								/>
								{field.state.meta.errors.map((error) => (
									<p key={String(error)} className="text-error text-sm">
										{String(error)}
									</p>
								))}
							</div>
						)}
					</form.Field>
				)}
			</form.Subscribe>

			{/* サークル名 */}
			<form.Field
				name="circleName"
				validators={{
					onChange: ({ value }) =>
						value.length > 200
							? "サークル名は200文字以内で入力してください"
							: undefined,
				}}
			>
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>サークル名 (任意)</Label>
						<input
							id={field.name}
							name={field.name}
							type="text"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="サークル名を入力"
							className="input w-full"
							autoComplete="off"
							data-1p-ignore
							data-lpignore="true"
							data-form-type="other"
						/>
						{field.state.meta.errors.map((error) => (
							<p key={String(error)} className="text-error text-sm">
								{String(error)}
							</p>
						))}
					</div>
				)}
			</form.Field>

			{/* 参考URL */}
			<form.Field
				name="referenceUrls"
				validators={{
					onChange: ({ value }) => validateReferenceUrls(value) ?? undefined,
				}}
			>
				{(field) => (
					<div className="space-y-2">
						<Label>参考URL *</Label>
						<p className="text-base-content/60 text-sm">
							アルバムに関する参考URLを1件以上入力してください（http / https
							のみ、最大10件）
						</p>
						<ReferenceUrlListInput
							value={field.state.value}
							onChange={(value) => field.handleChange(value)}
							error={
								field.state.meta.errors.length > 0
									? String(field.state.meta.errors[0])
									: undefined
							}
						/>
					</div>
				)}
			</form.Field>

			{/* 補足 */}
			<form.Field
				name="notes"
				validators={{
					onChange: ({ value }) =>
						value.length > 2000
							? "補足は2000文字以内で入力してください"
							: undefined,
				}}
			>
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>補足 (任意)</Label>
						<textarea
							id={field.name}
							name={field.name}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="管理者へ伝えたいことがあれば記入してください"
							rows={4}
							className="textarea w-full"
							autoComplete="off"
							data-1p-ignore
							data-lpignore="true"
							data-form-type="other"
						/>
						{field.state.meta.errors.map((error) => (
							<p key={String(error)} className="text-error text-sm">
								{String(error)}
							</p>
						))}
					</div>
				)}
			</form.Field>

			<form.Subscribe>
				{(state) => (
					<Button
						type="submit"
						className="w-full"
						disabled={!state.canSubmit || state.isSubmitting || isSubmitting}
					>
						{state.isSubmitting || isSubmitting ? "送信中..." : "送信する"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}

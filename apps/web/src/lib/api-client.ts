// SSR時はSERVER_URL（Docker内部通信用）、クライアント側はVITE_SERVER_URL（ブラウザ用）を使用
const getApiBaseUrl = () => {
	if (typeof window === "undefined") {
		// サーバーサイド（SSR）
		return (
			process.env.SERVER_URL ||
			import.meta.env.VITE_SERVER_URL ||
			"http://localhost:3000"
		);
	}
	// クライアントサイド
	return import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
};

const API_BASE_URL = getApiBaseUrl();

export interface Platform {
	code: string;
	name: string;
	category: string | null;
	urlPattern: string | null;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

export interface AliasType {
	code: string;
	label: string;
	description: string | null;
	sortOrder: number;
}

export interface CreditRole {
	code: string;
	label: string;
	description: string | null;
	sortOrder: number;
}

export interface OfficialWorkCategory {
	code: string;
	name: string;
	description: string | null;
	sortOrder: number;
}

export interface OfficialWork {
	id: string;
	categoryCode: string;
	name: string;
	nameJa: string;
	nameEn: string | null;
	shortNameJa: string | null;
	shortNameEn: string | null;
	numberInSeries: number | null;
	releaseDate: string | null;
	officialOrganization: string | null;
	position: number | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface OfficialSong {
	id: string;
	officialWorkId: string | null;
	trackNumber: number | null;
	name: string;
	nameJa: string;
	nameEn: string | null;
	composerName: string | null;
	arrangerName: string | null;
	isOriginal: boolean;
	sourceSongId: string | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
	workName?: string | null;
	sourceSongName?: string | null;
	workCategoryName?: string | null;
	workCategorySortOrder?: number | null;
}

export interface DashboardStats {
	users: number;
	platforms: number;
	aliasTypes: number;
	creditRoles: number;
	officialWorkCategories: number;
	officialWorks: number;
	officialSongs: number;
	artists: number;
	artistAliases: number;
	circles: number;
	events: number;
	eventSeries: number;
	releases: number;
	tracks: number;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
}

// SSR時にリクエストヘッダー（Cookie含む）を転送するためのオプション
export interface FetchOptions extends RequestInit {
	// SSR時に元のリクエストヘッダーを転送するためのヘッダー
	ssrHeaders?: Headers;
}

async function fetchWithAuth<T>(
	endpoint: string,
	options?: FetchOptions,
): Promise<T> {
	// SSR時のヘッダー転送: ssrHeadersからCookieを抽出して転送
	const ssrCookies = options?.ssrHeaders?.get("cookie");

	const res = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			// SSR時のCookie転送
			...(ssrCookies ? { cookie: ssrCookies } : {}),
			...options?.headers,
		},
	});

	if (!res.ok) {
		const error = await res.json().catch(() => ({ error: "Unknown error" }));
		throw new Error(error.error || `HTTP ${res.status}`);
	}

	return res.json();
}

// Platforms
export const platformsApi = {
	list: (params?: {
		page?: number;
		limit?: number;
		category?: string;
		search?: string;
		sortBy?: string;
		sortOrder?: "asc" | "desc";
	}) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.category) searchParams.set("category", params.category);
		if (params?.search) searchParams.set("search", params.search);
		if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
		if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
		const query = searchParams.toString();
		return fetchWithAuth<PaginatedResponse<Platform>>(
			`/api/admin/master/platforms${query ? `?${query}` : ""}`,
		);
	},
	get: (code: string) =>
		fetchWithAuth<Platform>(`/api/admin/master/platforms/${code}`),
	create: (data: Omit<Platform, "createdAt" | "updatedAt">) =>
		fetchWithAuth<Platform>("/api/admin/master/platforms", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (
		code: string,
		data: Partial<Omit<Platform, "code" | "createdAt" | "updatedAt">>,
	) =>
		fetchWithAuth<Platform>(`/api/admin/master/platforms/${code}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (code: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/master/platforms/${code}`,
			{
				method: "DELETE",
			},
		),
	reorder: (items: { code: string; sortOrder: number }[]) =>
		fetchWithAuth<{ success: boolean }>("/api/admin/master/platforms/reorder", {
			method: "PUT",
			body: JSON.stringify({ items }),
		}),
};

// Alias Types
export const aliasTypesApi = {
	list: (params?: {
		page?: number;
		limit?: number;
		search?: string;
		sortBy?: string;
		sortOrder?: "asc" | "desc";
	}) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.search) searchParams.set("search", params.search);
		if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
		if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
		const query = searchParams.toString();
		return fetchWithAuth<PaginatedResponse<AliasType>>(
			`/api/admin/master/alias-types${query ? `?${query}` : ""}`,
		);
	},
	get: (code: string) =>
		fetchWithAuth<AliasType>(`/api/admin/master/alias-types/${code}`),
	create: (data: Omit<AliasType, "sortOrder">) =>
		fetchWithAuth<AliasType>("/api/admin/master/alias-types", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (code: string, data: Partial<Omit<AliasType, "code">>) =>
		fetchWithAuth<AliasType>(`/api/admin/master/alias-types/${code}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (code: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/master/alias-types/${code}`,
			{
				method: "DELETE",
			},
		),
	reorder: (items: { code: string; sortOrder: number }[]) =>
		fetchWithAuth<{ success: boolean }>(
			"/api/admin/master/alias-types/reorder",
			{
				method: "PUT",
				body: JSON.stringify({ items }),
			},
		),
};

// Credit Roles
export const creditRolesApi = {
	list: (params?: {
		page?: number;
		limit?: number;
		search?: string;
		sortBy?: string;
		sortOrder?: "asc" | "desc";
	}) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.search) searchParams.set("search", params.search);
		if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
		if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
		const query = searchParams.toString();
		return fetchWithAuth<PaginatedResponse<CreditRole>>(
			`/api/admin/master/credit-roles${query ? `?${query}` : ""}`,
		);
	},
	get: (code: string) =>
		fetchWithAuth<CreditRole>(`/api/admin/master/credit-roles/${code}`),
	create: (data: Omit<CreditRole, "sortOrder">) =>
		fetchWithAuth<CreditRole>("/api/admin/master/credit-roles", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (code: string, data: Partial<Omit<CreditRole, "code">>) =>
		fetchWithAuth<CreditRole>(`/api/admin/master/credit-roles/${code}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (code: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/master/credit-roles/${code}`,
			{
				method: "DELETE",
			},
		),
	reorder: (items: { code: string; sortOrder: number }[]) =>
		fetchWithAuth<{ success: boolean }>(
			"/api/admin/master/credit-roles/reorder",
			{
				method: "PUT",
				body: JSON.stringify({ items }),
			},
		),
};

// Official Work Categories
// Import API
export interface ImportResult {
	success: boolean;
	created: number;
	updated: number;
	total: number;
}

export interface ImportError {
	error: string;
	rows?: Array<{ row: number; errors: string[] }>;
}

async function uploadFile(endpoint: string, file: File): Promise<ImportResult> {
	const formData = new FormData();
	formData.append("file", file);

	const res = await fetch(`${API_BASE_URL}${endpoint}`, {
		method: "POST",
		credentials: "include",
		body: formData,
	});

	const data = await res.json();

	if (!res.ok) {
		throw new Error(
			data.error ||
				(data.rows
					? `バリデーションエラー: ${data.rows.length}件`
					: `HTTP ${res.status}`),
		);
	}

	return data;
}

export const importApi = {
	platforms: (file: File) =>
		uploadFile("/api/admin/master/platforms/import", file),
	aliasTypes: (file: File) =>
		uploadFile("/api/admin/master/alias-types/import", file),
	creditRoles: (file: File) =>
		uploadFile("/api/admin/master/credit-roles/import", file),
	officialWorkCategories: (file: File) =>
		uploadFile("/api/admin/master/official-work-categories/import", file),
	officialWorks: (file: File) =>
		uploadFile("/api/admin/official/works/import", file),
	officialSongs: (file: File) =>
		uploadFile("/api/admin/official/songs/import", file),
};

// レガシーCSVインポート用の型定義
export interface LegacyCSVRecord {
	circle: string;
	album: string;
	title: string;
	trackNumber: number;
	event: string;
	vocalists: string[];
	arrangers: string[];
	lyricists: string[];
	originalSongs: string[];
}

export interface SongCandidate {
	id: string;
	name: string;
	nameJa: string | null;
	officialWorkName: string | null;
	matchType: "exact" | "partial";
}

export interface SongMatchResult {
	originalName: string;
	isOriginal: boolean;
	matchType: "exact" | "partial" | "none";
	candidates: SongCandidate[];
	autoMatched: boolean;
	selectedId: string | null;
	customSongName: string | null;
}

export interface NewEventNeeded {
	name: string;
	baseName: string;
	edition: number | null;
}

export interface NewEventInput {
	name: string;
	totalDays: number;
	startDate: string;
	endDate: string;
	eventDates: string[];
}

export interface ExistingEventDay {
	id: string;
	dayNumber: number;
	eventDate: string | null;
}

export interface ExistingEventWithDays {
	eventId: string;
	eventName: string;
	eventDays: ExistingEventDay[];
}

export interface LegacyPreviewResponse {
	success: boolean;
	records: LegacyCSVRecord[];
	songMatches: SongMatchResult[];
	newEventsNeeded: NewEventNeeded[];
	existingEventsWithDays?: ExistingEventWithDays[];
	errors: { row: number; message: string }[];
	error?: string;
}

export interface LegacyImportResult {
	success: boolean;
	events: { created: number; updated: number; skipped: number };
	eventDays: { created: number; updated: number; skipped: number };
	circles: { created: number; updated: number; skipped: number };
	artists: { created: number; updated: number; skipped: number };
	artistAliases: { created: number; updated: number; skipped: number };
	releases: { created: number; updated: number; skipped: number };
	discs: { created: number; updated: number; skipped: number };
	tracks: { created: number; updated: number; skipped: number };
	credits: { created: number; updated: number; skipped: number };
	officialSongLinks: { created: number; updated: number; skipped: number };
	errors: { row: number; entity: string; message: string }[];
}

// SSEストリーミング進捗用の型定義
export type ImportStage =
	| "preparing"
	| "events"
	| "circles"
	| "artists"
	| "releases"
	| "tracks"
	| "credits"
	| "links"
	| "complete";

export interface EntityProgress {
	processed: number;
	total: number;
}

export interface EntityProgressMap {
	events: EntityProgress;
	circles: EntityProgress;
	artists: EntityProgress;
	releases: EntityProgress;
	tracks: EntityProgress;
}

export interface ImportProgress {
	stage: ImportStage;
	current: number;
	total: number;
	message: string;
	entityProgress?: EntityProgressMap;
}

export const legacyImportApi = {
	preview: async (file: File): Promise<LegacyPreviewResponse> => {
		const formData = new FormData();
		formData.append("file", file);

		const res = await fetch(`${API_BASE_URL}/api/admin/import/legacy/preview`, {
			method: "POST",
			credentials: "include",
			body: formData,
		});

		const data = await res.json();

		if (!res.ok) {
			throw new Error(data.error || `HTTP ${res.status}`);
		}

		return data;
	},

	/**
	 * SSEストリーミング対応のインポート実行
	 * @param records CSVレコード
	 * @param songMappings 原曲マッピング
	 * @param customSongNames カスタム曲名
	 * @param newEvents 新規イベント
	 * @param onProgress 進捗コールバック
	 * @returns インポート結果
	 */
	executeWithProgress: async (
		records: LegacyCSVRecord[],
		songMappings: Record<string, string>,
		customSongNames: Record<string, string>,
		newEvents: NewEventInput[] | undefined,
		onProgress: (progress: ImportProgress) => void,
		eventDayMappings?: Record<string, string>,
	): Promise<LegacyImportResult> => {
		const res = await fetch(`${API_BASE_URL}/api/admin/import/legacy/execute`, {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
				Accept: "text/event-stream",
			},
			body: JSON.stringify({
				records,
				songMappings,
				customSongNames,
				newEvents,
				eventDayMappings,
			}),
		});

		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			throw new Error(data.error || `HTTP ${res.status}`);
		}

		const reader = res.body?.getReader();
		if (!reader) {
			throw new Error("ストリーム読み込みに失敗しました");
		}

		const decoder = new TextDecoder();
		let buffer = "";
		let result: LegacyImportResult | null = null;

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });

			// SSEイベントをパース
			const lines = buffer.split("\n");
			buffer = lines.pop() || ""; // 未完成の行を保持

			let eventType = "";
			let eventData = "";

			for (const line of lines) {
				if (line.startsWith("event:")) {
					eventType = line.slice(6).trim();
				} else if (line.startsWith("data:")) {
					eventData = line.slice(5).trim();
				} else if (line === "" && eventData) {
					// 空行でイベント完了
					try {
						const parsed = JSON.parse(eventData);
						if (eventType === "progress") {
							onProgress(parsed as ImportProgress);
						} else if (eventType === "result") {
							result = parsed as LegacyImportResult;
						} else if (eventType === "error") {
							throw new Error(parsed.error || "インポートエラー");
						}
					} catch (e) {
						if (e instanceof SyntaxError) {
							console.error("SSE parse error:", eventData);
						} else {
							throw e;
						}
					}
					eventType = "";
					eventData = "";
				}
			}
		}

		if (!result) {
			throw new Error("インポート結果を取得できませんでした");
		}

		return result;
	},

	/**
	 * 従来のインポート実行（進捗なし、後方互換性用）
	 */
	execute: async (
		records: LegacyCSVRecord[],
		songMappings: Record<string, string>,
		customSongNames: Record<string, string>,
		newEvents?: NewEventInput[],
		eventDayMappings?: Record<string, string>,
	): Promise<LegacyImportResult> => {
		return legacyImportApi.executeWithProgress(
			records,
			songMappings,
			customSongNames,
			newEvents,
			() => {}, // 進捗を無視
			eventDayMappings,
		);
	},
};

export const officialWorkCategoriesApi = {
	list: (params?: {
		page?: number;
		limit?: number;
		search?: string;
		sortBy?: string;
		sortOrder?: "asc" | "desc";
	}) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.search) searchParams.set("search", params.search);
		if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
		if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
		const query = searchParams.toString();
		return fetchWithAuth<PaginatedResponse<OfficialWorkCategory>>(
			`/api/admin/master/official-work-categories${query ? `?${query}` : ""}`,
		);
	},
	get: (code: string) =>
		fetchWithAuth<OfficialWorkCategory>(
			`/api/admin/master/official-work-categories/${code}`,
		),
	create: (data: Omit<OfficialWorkCategory, "sortOrder">) =>
		fetchWithAuth<OfficialWorkCategory>(
			"/api/admin/master/official-work-categories",
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
	update: (code: string, data: Partial<Omit<OfficialWorkCategory, "code">>) =>
		fetchWithAuth<OfficialWorkCategory>(
			`/api/admin/master/official-work-categories/${code}`,
			{
				method: "PUT",
				body: JSON.stringify(data),
			},
		),
	delete: (code: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/master/official-work-categories/${code}`,
			{
				method: "DELETE",
			},
		),
	reorder: (items: { code: string; sortOrder: number }[]) =>
		fetchWithAuth<{ success: boolean }>(
			"/api/admin/master/official-work-categories/reorder",
			{
				method: "PUT",
				body: JSON.stringify({ items }),
			},
		),
};

// Official Works
export const officialWorksApi = {
	list: (params?: {
		page?: number;
		limit?: number;
		category?: string;
		search?: string;
	}) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.category) searchParams.set("category", params.category);
		if (params?.search) searchParams.set("search", params.search);
		const query = searchParams.toString();
		return fetchWithAuth<PaginatedResponse<OfficialWork>>(
			`/api/admin/official/works${query ? `?${query}` : ""}`,
		);
	},
	get: (id: string) =>
		fetchWithAuth<OfficialWork>(`/api/admin/official/works/${id}`),
	create: (data: Omit<OfficialWork, "createdAt" | "updatedAt">) =>
		fetchWithAuth<OfficialWork>("/api/admin/official/works", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (
		id: string,
		data: Partial<Omit<OfficialWork, "id" | "createdAt" | "updatedAt">>,
	) =>
		fetchWithAuth<OfficialWork>(`/api/admin/official/works/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (id: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/official/works/${id}`,
			{
				method: "DELETE",
			},
		),
};

// Official Songs
export const officialSongsApi = {
	list: (params?: {
		page?: number;
		limit?: number;
		workId?: string;
		search?: string;
		sourceSongId?: string;
	}) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.workId) searchParams.set("workId", params.workId);
		if (params?.search) searchParams.set("search", params.search);
		if (params?.sourceSongId)
			searchParams.set("sourceSongId", params.sourceSongId);
		const query = searchParams.toString();
		return fetchWithAuth<PaginatedResponse<OfficialSong>>(
			`/api/admin/official/songs${query ? `?${query}` : ""}`,
		);
	},
	get: (id: string) =>
		fetchWithAuth<OfficialSong>(`/api/admin/official/songs/${id}`),
	create: (data: Omit<OfficialSong, "createdAt" | "updatedAt" | "workName">) =>
		fetchWithAuth<OfficialSong>("/api/admin/official/songs", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (
		id: string,
		data: Partial<
			Omit<OfficialSong, "id" | "createdAt" | "updatedAt" | "workName">
		>,
	) =>
		fetchWithAuth<OfficialSong>(`/api/admin/official/songs/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (id: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/official/songs/${id}`,
			{
				method: "DELETE",
			},
		),
};

// Official Work Links
export interface OfficialWorkLink {
	id: string;
	officialWorkId: string;
	platformCode: string;
	url: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
	platformName?: string | null;
}

export const officialWorkLinksApi = {
	list: (workId: string) =>
		fetchWithAuth<OfficialWorkLink[]>(
			`/api/admin/official/works/${workId}/links`,
		),
	create: (
		workId: string,
		data: Omit<
			OfficialWorkLink,
			"officialWorkId" | "createdAt" | "updatedAt" | "platformName"
		>,
	) =>
		fetchWithAuth<OfficialWorkLink>(
			`/api/admin/official/works/${workId}/links`,
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
	update: (
		workId: string,
		linkId: string,
		data: Partial<
			Omit<
				OfficialWorkLink,
				"id" | "officialWorkId" | "createdAt" | "updatedAt" | "platformName"
			>
		>,
	) =>
		fetchWithAuth<OfficialWorkLink>(
			`/api/admin/official/works/${workId}/links/${linkId}`,
			{
				method: "PUT",
				body: JSON.stringify(data),
			},
		),
	delete: (workId: string, linkId: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/official/works/${workId}/links/${linkId}`,
			{
				method: "DELETE",
			},
		),
	reorder: (workId: string, linkId: string, sortOrder: number) =>
		fetchWithAuth<OfficialWorkLink>(
			`/api/admin/official/works/${workId}/links/${linkId}/reorder`,
			{
				method: "PUT",
				body: JSON.stringify({ sortOrder }),
			},
		),
};

// Official Song Links
export interface OfficialSongLink {
	id: string;
	officialSongId: string;
	platformCode: string;
	url: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
	platformName?: string | null;
}

export const officialSongLinksApi = {
	list: (songId: string) =>
		fetchWithAuth<OfficialSongLink[]>(
			`/api/admin/official/songs/${songId}/links`,
		),
	create: (
		songId: string,
		data: Omit<
			OfficialSongLink,
			"officialSongId" | "createdAt" | "updatedAt" | "platformName"
		>,
	) =>
		fetchWithAuth<OfficialSongLink>(
			`/api/admin/official/songs/${songId}/links`,
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
	update: (
		songId: string,
		linkId: string,
		data: Partial<
			Omit<
				OfficialSongLink,
				"id" | "officialSongId" | "createdAt" | "updatedAt" | "platformName"
			>
		>,
	) =>
		fetchWithAuth<OfficialSongLink>(
			`/api/admin/official/songs/${songId}/links/${linkId}`,
			{
				method: "PUT",
				body: JSON.stringify(data),
			},
		),
	delete: (songId: string, linkId: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/official/songs/${songId}/links/${linkId}`,
			{
				method: "DELETE",
			},
		),
	reorder: (songId: string, linkId: string, sortOrder: number) =>
		fetchWithAuth<OfficialSongLink>(
			`/api/admin/official/songs/${songId}/links/${linkId}/reorder`,
			{
				method: "PUT",
				body: JSON.stringify({ sortOrder }),
			},
		),
};

// Stats
export const statsApi = {
	get: () => fetchWithAuth<DashboardStats>("/api/admin/stats"),
};

// ===== アーティスト・サークル管理 =====

export type InitialScript =
	| "latin"
	| "hiragana"
	| "katakana"
	| "kanji"
	| "digit"
	| "symbol"
	| "other";

export const INITIAL_SCRIPT_LABELS: Record<InitialScript, string> = {
	latin: "ラテン文字 (A-Z)",
	hiragana: "ひらがな",
	katakana: "カタカナ",
	kanji: "漢字",
	digit: "数字",
	symbol: "記号",
	other: "その他",
};

export const INITIAL_SCRIPT_BADGE_VARIANTS: Record<
	InitialScript,
	"primary" | "success" | "info" | "warning" | "accent" | "ghost"
> = {
	latin: "primary",
	hiragana: "success",
	katakana: "info",
	kanji: "warning",
	digit: "accent",
	symbol: "ghost",
	other: "ghost",
};

export interface Artist {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	sortName: string | null;
	nameInitial: string | null;
	initialScript: InitialScript;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ArtistAlias {
	id: string;
	artistId: string;
	name: string;
	aliasTypeCode: string | null;
	nameInitial: string | null;
	initialScript: InitialScript;
	periodFrom: string | null;
	periodTo: string | null;
	createdAt: string;
	updatedAt: string;
	artistName?: string | null;
}

export interface ArtistWithAliases extends Artist {
	aliases: ArtistAlias[];
}

export interface Circle {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	sortName: string | null;
	nameInitial: string | null;
	initialScript: InitialScript;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CircleLink {
	id: string;
	circleId: string;
	platformCode: string;
	url: string;
	platformId: string | null;
	handle: string | null;
	isOfficial: boolean;
	isPrimary: boolean;
	createdAt: string;
	updatedAt: string;
	platformName?: string | null;
}

export interface CircleWithLinks extends Circle {
	links: CircleLink[];
}

// アーティスト関連楽曲の型定義
export interface ArtistTrackRelease {
	id: string;
	name: string;
	releaseDate: string | null;
	circleNames: string | null;
}

export interface ArtistTrack {
	id: string;
	name: string;
	nameJa: string | null;
	trackNumber: number;
	release: ArtistTrackRelease | null;
}

export interface ArtistStatistics {
	releaseCount: number;
	earliestReleaseDate: string | null;
	latestReleaseDate: string | null;
}

export interface ArtistTracksResponse {
	totalUniqueTrackCount: number;
	byRole: Record<string, number>;
	tracks: ArtistTrack[];
	statistics: ArtistStatistics;
}

export interface ArtistCircle {
	circleId: string;
	circleName: string;
	releaseCount: number;
	participationTypes: string[];
}

// アーティスト統合レスポンス
export interface ArtistFullStats {
	trackCount: number;
	releaseCount: number;
	circleCount: number;
	byRole: Record<string, number>;
	earliestReleaseDate: string | null;
	latestReleaseDate: string | null;
}

export interface ArtistFullResponse {
	artist: ArtistWithAliases;
	tracks: {
		data: ArtistTrack[];
		total: number;
	};
	circles: ArtistCircle[];
	stats: ArtistFullStats;
}

// Artists
export const artistsApi = {
	list: (params?: {
		page?: number;
		limit?: number;
		initialScript?: string;
		search?: string;
	}) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.initialScript)
			searchParams.set("initialScript", params.initialScript);
		if (params?.search) searchParams.set("search", params.search);
		const query = searchParams.toString();
		return fetchWithAuth<PaginatedResponse<Artist>>(
			`/api/admin/artists${query ? `?${query}` : ""}`,
		);
	},
	get: (id: string) =>
		fetchWithAuth<ArtistWithAliases>(`/api/admin/artists/${id}`),
	getFull: (id: string, ssrHeaders?: Headers) =>
		fetchWithAuth<ArtistFullResponse>(`/api/admin/artists/${id}/full`, {
			ssrHeaders,
		}),
	getTracks: (id: string) =>
		fetchWithAuth<ArtistTracksResponse>(`/api/admin/artists/${id}/tracks`),
	getCircles: (id: string) =>
		fetchWithAuth<ArtistCircle[]>(`/api/admin/artists/${id}/circles`),
	create: (data: Omit<Artist, "createdAt" | "updatedAt">) =>
		fetchWithAuth<Artist>("/api/admin/artists", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (
		id: string,
		data: Partial<Omit<Artist, "id" | "createdAt" | "updatedAt">>,
	) =>
		fetchWithAuth<Artist>(`/api/admin/artists/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (id: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/artists/${id}`,
			{
				method: "DELETE",
			},
		),
	batchDelete: (ids: string[]) =>
		fetchWithAuth<{
			success: boolean;
			deleted: string[];
			failed: Array<{ id: string; error: string }>;
		}>("/api/admin/artists/batch", {
			method: "DELETE",
			body: JSON.stringify({ ids }),
		}),
};

// Artist Aliases
export const artistAliasesApi = {
	list: (params?: {
		page?: number;
		limit?: number;
		artistId?: string;
		search?: string;
	}) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.artistId) searchParams.set("artistId", params.artistId);
		if (params?.search) searchParams.set("search", params.search);
		const query = searchParams.toString();
		return fetchWithAuth<PaginatedResponse<ArtistAlias>>(
			`/api/admin/artist-aliases${query ? `?${query}` : ""}`,
		);
	},
	get: (id: string) =>
		fetchWithAuth<ArtistAlias>(`/api/admin/artist-aliases/${id}`),
	getTracks: (id: string) =>
		fetchWithAuth<ArtistTracksResponse>(
			`/api/admin/artist-aliases/${id}/tracks`,
		),
	create: (data: Omit<ArtistAlias, "createdAt" | "updatedAt" | "artistName">) =>
		fetchWithAuth<ArtistAlias>("/api/admin/artist-aliases", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (
		id: string,
		data: Partial<
			Omit<ArtistAlias, "id" | "createdAt" | "updatedAt" | "artistName">
		>,
	) =>
		fetchWithAuth<ArtistAlias>(`/api/admin/artist-aliases/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (id: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/artist-aliases/${id}`,
			{
				method: "DELETE",
			},
		),
	batchDelete: (ids: string[]) =>
		fetchWithAuth<{
			success: boolean;
			deleted: string[];
			failed: Array<{ id: string; error: string }>;
		}>("/api/admin/artist-aliases/batch", {
			method: "DELETE",
			body: JSON.stringify({ ids }),
		}),
};

// Circles
export const circlesApi = {
	list: (params?: {
		page?: number;
		limit?: number;
		initialScript?: string;
		search?: string;
	}) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.initialScript)
			searchParams.set("initialScript", params.initialScript);
		if (params?.search) searchParams.set("search", params.search);
		const query = searchParams.toString();
		return fetchWithAuth<PaginatedResponse<Circle>>(
			`/api/admin/circles${query ? `?${query}` : ""}`,
		);
	},
	get: (id: string) =>
		fetchWithAuth<CircleWithLinks>(`/api/admin/circles/${id}`),
	create: (data: Omit<Circle, "createdAt" | "updatedAt">) =>
		fetchWithAuth<Circle>("/api/admin/circles", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (
		id: string,
		data: Partial<Omit<Circle, "id" | "createdAt" | "updatedAt">>,
	) =>
		fetchWithAuth<Circle>(`/api/admin/circles/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (id: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/circles/${id}`,
			{
				method: "DELETE",
			},
		),
	batchDelete: (ids: string[]) =>
		fetchWithAuth<{
			success: boolean;
			deleted: string[];
			failed: Array<{ id: string; error: string }>;
		}>("/api/admin/circles/batch", {
			method: "DELETE",
			body: JSON.stringify({ ids }),
		}),
};

// Circle Links
export const circleLinksApi = {
	list: (circleId: string) =>
		fetchWithAuth<CircleLink[]>(`/api/admin/circles/${circleId}/links`),
	create: (
		circleId: string,
		data: Omit<
			CircleLink,
			"circleId" | "createdAt" | "updatedAt" | "platformName"
		>,
	) =>
		fetchWithAuth<CircleLink>(`/api/admin/circles/${circleId}/links`, {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (
		circleId: string,
		linkId: string,
		data: Partial<
			Omit<
				CircleLink,
				"id" | "circleId" | "createdAt" | "updatedAt" | "platformName"
			>
		>,
	) =>
		fetchWithAuth<CircleLink>(
			`/api/admin/circles/${circleId}/links/${linkId}`,
			{
				method: "PUT",
				body: JSON.stringify(data),
			},
		),
	delete: (circleId: string, linkId: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/circles/${circleId}/links/${linkId}`,
			{
				method: "DELETE",
			},
		),
};

// ===== イベント管理 =====

export interface EventSeries {
	id: string;
	name: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

export interface Event {
	id: string;
	eventSeriesId: string | null;
	name: string;
	edition: number | null;
	totalDays: number | null;
	venue: string | null;
	startDate: string | null;
	endDate: string | null;
	createdAt: string;
	updatedAt: string;
	seriesName?: string | null;
}

export interface EventDay {
	id: string;
	eventId: string;
	dayNumber: number;
	date: string;
	createdAt: string;
	updatedAt: string;
}

export interface EventWithDays extends Event {
	days: EventDay[];
}

export interface EventSeriesWithEvents extends EventSeries {
	events: Event[];
}

// Event Series
export const eventSeriesApi = {
	get: (id: string) =>
		fetchWithAuth<EventSeriesWithEvents>(`/api/admin/event-series/${id}`),
	list: (params?: {
		search?: string;
		sortBy?: string;
		sortOrder?: "asc" | "desc";
	}) => {
		const searchParams = new URLSearchParams();
		if (params?.search) searchParams.set("search", params.search);
		if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
		if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
		const query = searchParams.toString();
		return fetchWithAuth<{ data: EventSeries[]; total: number }>(
			`/api/admin/event-series${query ? `?${query}` : ""}`,
		);
	},
	create: (data: Omit<EventSeries, "createdAt" | "updatedAt">) =>
		fetchWithAuth<EventSeries>("/api/admin/event-series", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (
		id: string,
		data: Partial<Omit<EventSeries, "id" | "createdAt" | "updatedAt">>,
	) =>
		fetchWithAuth<EventSeries>(`/api/admin/event-series/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (id: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/event-series/${id}`,
			{
				method: "DELETE",
			},
		),
	reorder: (items: { id: string; sortOrder: number }[]) =>
		fetchWithAuth<{ success: boolean }>("/api/admin/event-series/reorder", {
			method: "PUT",
			body: JSON.stringify({ items }),
		}),
};

// Events
export const eventsApi = {
	list: (params?: {
		page?: number;
		limit?: number;
		seriesId?: string;
		search?: string;
	}) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.seriesId) searchParams.set("seriesId", params.seriesId);
		if (params?.search) searchParams.set("search", params.search);
		const query = searchParams.toString();
		return fetchWithAuth<PaginatedResponse<Event>>(
			`/api/admin/events${query ? `?${query}` : ""}`,
		);
	},
	get: (id: string) => fetchWithAuth<EventWithDays>(`/api/admin/events/${id}`),
	create: (data: Omit<Event, "createdAt" | "updatedAt" | "seriesName">) =>
		fetchWithAuth<Event>("/api/admin/events", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (
		id: string,
		data: Partial<Omit<Event, "id" | "createdAt" | "updatedAt" | "seriesName">>,
	) =>
		fetchWithAuth<Event>(`/api/admin/events/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (id: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(`/api/admin/events/${id}`, {
			method: "DELETE",
		}),
};

// Event Days
export const eventDaysApi = {
	list: (eventId: string) =>
		fetchWithAuth<EventDay[]>(`/api/admin/events/${eventId}/days`),
	create: (
		eventId: string,
		data: Omit<EventDay, "eventId" | "createdAt" | "updatedAt">,
	) =>
		fetchWithAuth<EventDay>(`/api/admin/events/${eventId}/days`, {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (
		eventId: string,
		dayId: string,
		data: Partial<Omit<EventDay, "id" | "eventId" | "createdAt" | "updatedAt">>,
	) =>
		fetchWithAuth<EventDay>(`/api/admin/events/${eventId}/days/${dayId}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (eventId: string, dayId: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/events/${eventId}/days/${dayId}`,
			{
				method: "DELETE",
			},
		),
};

// ===== 作品管理 =====

export type ReleaseType = "album" | "single" | "ep" | "digital" | "video";

export const RELEASE_TYPE_LABELS: Record<ReleaseType, string> = {
	album: "アルバム",
	single: "シングル",
	ep: "EP",
	digital: "配信",
	video: "映像",
};

export const RELEASE_TYPE_COLORS: Record<
	ReleaseType,
	"primary" | "secondary" | "accent" | "info" | "warning"
> = {
	album: "primary",
	single: "secondary",
	ep: "accent",
	digital: "info",
	video: "warning",
};

export interface Release {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	releaseDate: string | null;
	releaseYear: number | null;
	releaseMonth: number | null;
	releaseDay: number | null;
	releaseType: ReleaseType | null;
	eventId: string | null;
	eventDayId: string | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ReleaseWithCounts extends Release {
	discCount: number;
	trackCount: number;
	eventName: string | null;
	eventDayNumber: number | null;
	eventDayDate: string | null;
}

export interface Disc {
	id: string;
	releaseId: string;
	discNumber: number;
	discName: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ReleaseWithDiscs extends Release {
	discs: Disc[];
}

// Releases
export const releasesApi = {
	list: (params?: {
		page?: number;
		limit?: number;
		releaseType?: string;
		search?: string;
	}) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.releaseType)
			searchParams.set("releaseType", params.releaseType);
		if (params?.search) searchParams.set("search", params.search);
		const query = searchParams.toString();
		return fetchWithAuth<PaginatedResponse<ReleaseWithCounts>>(
			`/api/admin/releases${query ? `?${query}` : ""}`,
		);
	},
	get: (id: string) =>
		fetchWithAuth<ReleaseWithDiscs>(`/api/admin/releases/${id}`),
	create: (data: Omit<Release, "createdAt" | "updatedAt">) =>
		fetchWithAuth<Release>("/api/admin/releases", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (
		id: string,
		data: Partial<Omit<Release, "id" | "createdAt" | "updatedAt">>,
	) =>
		fetchWithAuth<Release>(`/api/admin/releases/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (id: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/releases/${id}`,
			{
				method: "DELETE",
			},
		),
	batchDelete: (ids: string[]) =>
		fetchWithAuth<{
			success: boolean;
			deleted: string[];
			failed: Array<{ id: string; error: string }>;
		}>("/api/admin/releases/batch", {
			method: "DELETE",
			body: JSON.stringify({ ids }),
		}),
};

// リリース統合レスポンス
export interface ReleaseEventInfo {
	id: string;
	name: string;
	dayId: string | null;
	dayNumber: number | null;
	dayDate: string | null;
}

export interface ReleaseFullStats {
	discCount: number;
	trackCount: number;
	circleCount: number;
}

export interface ReleaseFullResponse {
	release: ReleaseWithDiscs;
	tracks: TrackWithCreditCount[];
	circles: ReleaseCircleWithCircle[];
	publications: ReleasePublication[];
	janCodes: ReleaseJanCode[];
	event: ReleaseEventInfo | null;
	stats: ReleaseFullStats;
}

export const releasesFullApi = {
	get: (id: string, ssrHeaders?: Headers) =>
		fetchWithAuth<ReleaseFullResponse>(`/api/admin/releases/${id}/full`, {
			ssrHeaders,
		}),
};

// Discs
export const discsApi = {
	list: (releaseId: string) =>
		fetchWithAuth<Disc[]>(`/api/admin/releases/${releaseId}/discs`),
	create: (
		releaseId: string,
		data: Omit<Disc, "releaseId" | "createdAt" | "updatedAt">,
	) =>
		fetchWithAuth<Disc>(`/api/admin/releases/${releaseId}/discs`, {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (
		releaseId: string,
		discId: string,
		data: Partial<Omit<Disc, "id" | "releaseId" | "createdAt" | "updatedAt">>,
	) =>
		fetchWithAuth<Disc>(`/api/admin/releases/${releaseId}/discs/${discId}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (releaseId: string, discId: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/releases/${releaseId}/discs/${discId}`,
			{
				method: "DELETE",
			},
		),
};

// ===== 作品とサークルの関連付け =====

export type ParticipationType =
	| "host"
	| "co-host"
	| "participant"
	| "guest"
	| "split_partner";

export const PARTICIPATION_TYPE_LABELS: Record<ParticipationType, string> = {
	host: "主催",
	"co-host": "共同主催",
	participant: "参加",
	guest: "ゲスト",
	split_partner: "スプリット",
};

export const PARTICIPATION_TYPE_COLORS: Record<
	ParticipationType,
	"primary" | "secondary" | "accent" | "info" | "warning"
> = {
	host: "primary",
	"co-host": "secondary",
	participant: "accent",
	guest: "info",
	split_partner: "warning",
};

export interface ReleaseCircle {
	releaseId: string;
	circleId: string;
	participationType: ParticipationType;
	position: number | null;
}

export interface ReleaseCircleWithCircle extends ReleaseCircle {
	circle: {
		id: string;
		name: string;
		nameJa: string | null;
		nameEn: string | null;
	};
}

// Release Circles (作品とサークルの関連付け)
export const releaseCirclesApi = {
	list: (releaseId: string) =>
		fetchWithAuth<ReleaseCircleWithCircle[]>(
			`/api/admin/releases/${releaseId}/circles`,
		),
	add: (
		releaseId: string,
		data: {
			circleId: string;
			participationType?: ParticipationType;
			position?: number;
		},
	) =>
		fetchWithAuth<ReleaseCircle>(`/api/admin/releases/${releaseId}/circles`, {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (
		releaseId: string,
		circleId: string,
		participationType: ParticipationType,
		data: { participationType?: ParticipationType; position?: number },
	) =>
		fetchWithAuth<ReleaseCircle>(
			`/api/admin/releases/${releaseId}/circles/${circleId}?participationType=${encodeURIComponent(participationType)}`,
			{
				method: "PATCH",
				body: JSON.stringify(data),
			},
		),
	remove: (
		releaseId: string,
		circleId: string,
		participationType: ParticipationType,
	) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/releases/${releaseId}/circles/${circleId}?participationType=${encodeURIComponent(participationType)}`,
			{
				method: "DELETE",
			},
		),
};

// ===== サークルのリリース一覧 =====

export interface CircleReleaseItem {
	id: string;
	name: string;
	releaseDate: string | null;
	releaseType: string | null;
}

export interface CircleReleasesByType {
	participationType: ParticipationType;
	releases: CircleReleaseItem[];
}

export const circleReleasesApi = {
	list: (circleId: string) =>
		fetchWithAuth<CircleReleasesByType[]>(
			`/api/admin/circles/${circleId}/releases`,
		),
};

// ===== サークルのアーティスト一覧 =====

export interface CircleArtist {
	artistId: string;
	artistName: string;
	trackCount: number;
	releaseCount: number;
	roles: string[];
}

export interface CircleStatistics {
	totalArtistCount: number;
	totalTrackCount: number;
	releaseCount: number;
	earliestReleaseDate: string | null;
	latestReleaseDate: string | null;
}

export interface CircleArtistsResponse {
	artists: CircleArtist[];
	statistics: CircleStatistics;
}

export const circleArtistsApi = {
	list: (circleId: string) =>
		fetchWithAuth<CircleArtistsResponse>(
			`/api/admin/circles/${circleId}/artists`,
		),
};

// サークル統合レスポンス
export interface CircleFullStats {
	artistCount: number;
	releaseCount: number;
	trackCount: number;
	earliestReleaseDate: string | null;
	latestReleaseDate: string | null;
}

export interface CircleFullResponse {
	circle: CircleWithLinks;
	artists: CircleArtistsResponse;
	releases: CircleReleasesByType[];
	stats: CircleFullStats;
}

export const circlesFullApi = {
	get: (id: string, ssrHeaders?: Headers) =>
		fetchWithAuth<CircleFullResponse>(`/api/admin/circles/${id}/full`, {
			ssrHeaders,
		}),
};

// ===== トラック管理 =====

export interface Track {
	id: string;
	releaseId: string | null;
	discId: string | null;
	trackNumber: number;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	releaseDate: string | null;
	releaseYear: number | null;
	releaseMonth: number | null;
	releaseDay: number | null;
	eventId: string | null;
	eventDayId: string | null;
	createdAt: string;
	updatedAt: string;
	releaseName?: string | null;
}

export interface TrackWithCreditCount extends Track {
	creditCount: number;
	vocalists: string | null;
	arrangers: string | null;
	lyricists: string | null;
	originalSongs: string | null;
}

export interface TrackDetail extends Track {
	release: Release | null;
	disc: Disc | null;
	credits: TrackCredit[];
	eventName: string | null;
	eventDayNumber: number | null;
	eventDayDate: string | null;
}

export interface TrackCreditRole {
	trackCreditId: string;
	roleCode: string;
	rolePosition: number;
	role: CreditRole | null;
}

export interface TrackCredit {
	id: string;
	trackId: string;
	artistId: string;
	creditName: string;
	aliasTypeCode: string | null;
	creditPosition: number | null;
	artistAliasId: string | null;
	createdAt: string;
	updatedAt: string;
	artist: Artist | null;
	artistAlias: ArtistAlias | null;
	roles: TrackCreditRole[];
}

// Track list item with release info (paginated API response)
export interface TrackListItem extends Track {
	releaseName: string | null;
	discNumber: number | null;
	eventName: string | null;
	eventDayNumber: number | null;
	eventDayDate: string | null;
	creditCount: number;
	vocalists: string | null;
	arrangers: string | null;
	lyricists: string | null;
	originalSongs: string | null;
	circles: string | null;
}

// Tracks
export const tracksApi = {
	get: (trackId: string, ssrHeaders?: Headers) =>
		fetchWithAuth<TrackDetail>(`/api/admin/tracks/${trackId}`, { ssrHeaders }),
	listPaginated: (params?: {
		page?: number;
		limit?: number;
		search?: string;
		releaseId?: string;
		sortBy?: string;
		sortOrder?: "asc" | "desc";
	}) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.search) searchParams.set("search", params.search);
		if (params?.releaseId) searchParams.set("releaseId", params.releaseId);
		if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
		if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
		const query = searchParams.toString();
		return fetchWithAuth<PaginatedResponse<TrackListItem>>(
			`/api/admin/tracks${query ? `?${query}` : ""}`,
		);
	},
	list: (releaseId: string) =>
		fetchWithAuth<TrackWithCreditCount[]>(
			`/api/admin/releases/${releaseId}/tracks`,
		),
	create: (
		releaseId: string,
		data: Omit<Track, "releaseId" | "createdAt" | "updatedAt">,
	) =>
		fetchWithAuth<Track>(`/api/admin/releases/${releaseId}/tracks`, {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (
		releaseId: string,
		trackId: string,
		data: Partial<Omit<Track, "id" | "releaseId" | "createdAt" | "updatedAt">>,
	) =>
		fetchWithAuth<Track>(`/api/admin/releases/${releaseId}/tracks/${trackId}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (releaseId: string, trackId: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/releases/${releaseId}/tracks/${trackId}`,
			{
				method: "DELETE",
			},
		),
	reorder: (releaseId: string, trackId: string, direction: "up" | "down") =>
		fetchWithAuth<Track[]>(
			`/api/admin/releases/${releaseId}/tracks/${trackId}/reorder`,
			{
				method: "PATCH",
				body: JSON.stringify({ direction }),
			},
		),
	batchDelete: (items: Array<{ trackId: string; releaseId: string }>) =>
		fetchWithAuth<{
			success: boolean;
			deleted: string[];
			failed: Array<{ trackId: string; error: string }>;
		}>("/api/admin/tracks/batch", {
			method: "DELETE",
			body: JSON.stringify({ items }),
		}),
};

// Track Credits
export const trackCreditsApi = {
	list: (releaseId: string, trackId: string) =>
		fetchWithAuth<TrackCredit[]>(
			`/api/admin/releases/${releaseId}/tracks/${trackId}/credits`,
		),
	create: (
		releaseId: string,
		trackId: string,
		data: {
			id: string;
			artistId: string;
			creditName: string;
			aliasTypeCode?: string | null;
			creditPosition?: number | null;
			artistAliasId?: string | null;
			rolesCodes?: string[];
		},
	) =>
		fetchWithAuth<TrackCredit>(
			`/api/admin/releases/${releaseId}/tracks/${trackId}/credits`,
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
	update: (
		releaseId: string,
		trackId: string,
		creditId: string,
		data: {
			artistId?: string;
			creditName?: string;
			aliasTypeCode?: string | null;
			creditPosition?: number | null;
			artistAliasId?: string | null;
			rolesCodes?: string[];
		},
	) =>
		fetchWithAuth<TrackCredit>(
			`/api/admin/releases/${releaseId}/tracks/${trackId}/credits/${creditId}`,
			{
				method: "PUT",
				body: JSON.stringify(data),
			},
		),
	delete: (releaseId: string, trackId: string, creditId: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/releases/${releaseId}/tracks/${trackId}/credits/${creditId}`,
			{
				method: "DELETE",
			},
		),
};

// Track Credit Roles
export const trackCreditRolesApi = {
	add: (
		releaseId: string,
		trackId: string,
		creditId: string,
		data: { roleCode: string; rolePosition?: number },
	) =>
		fetchWithAuth<TrackCreditRole>(
			`/api/admin/releases/${releaseId}/tracks/${trackId}/credits/${creditId}/roles`,
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
	remove: (
		releaseId: string,
		trackId: string,
		creditId: string,
		roleCode: string,
		rolePosition: number,
	) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/releases/${releaseId}/tracks/${trackId}/credits/${creditId}/roles/${roleCode}/${rolePosition}`,
			{
				method: "DELETE",
			},
		),
};

// Track Official Songs (原曲紐付け)
export interface TrackOfficialSong {
	id: string;
	trackId: string;
	officialSongId: string | null;
	customSongName: string | null;
	partPosition: number | null;
	startSecond: number | null;
	endSecond: number | null;
	notes: string | null;
	createdAt: Date | null;
	updatedAt: Date | null;
	officialSong?: OfficialSong | null;
}

export const trackOfficialSongsApi = {
	list: (trackId: string) =>
		fetchWithAuth<TrackOfficialSong[]>(
			`/api/admin/tracks/${trackId}/official-songs`,
		),
	create: (
		trackId: string,
		data: {
			id: string;
			officialSongId?: string | null;
			customSongName?: string | null;
			partPosition?: number | null;
			startSecond?: number | null;
			endSecond?: number | null;
			notes?: string | null;
		},
	) =>
		fetchWithAuth<TrackOfficialSong>(
			`/api/admin/tracks/${trackId}/official-songs`,
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
	update: (
		trackId: string,
		id: string,
		data: {
			partPosition?: number | null;
			startSecond?: number | null;
			endSecond?: number | null;
			notes?: string | null;
		},
	) =>
		fetchWithAuth<TrackOfficialSong>(
			`/api/admin/tracks/${trackId}/official-songs/${id}`,
			{
				method: "PUT",
				body: JSON.stringify(data),
			},
		),
	delete: (trackId: string, id: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/tracks/${trackId}/official-songs/${id}`,
			{
				method: "DELETE",
			},
		),
	reorder: (trackId: string, id: string, direction: "up" | "down") =>
		fetchWithAuth<TrackOfficialSong[]>(
			`/api/admin/tracks/${trackId}/official-songs/${id}/reorder`,
			{
				method: "PATCH",
				body: JSON.stringify({ direction }),
			},
		),
};

// Track Derivations (派生関係)
export interface TrackDerivation {
	id: string;
	childTrackId: string;
	parentTrackId: string;
	notes: string | null;
	createdAt: Date | null;
	updatedAt: Date | null;
	parentTrack?: Track | null;
}

export const trackDerivationsApi = {
	list: (trackId: string) =>
		fetchWithAuth<TrackDerivation[]>(
			`/api/admin/tracks/${trackId}/derivations`,
		),
	create: (
		trackId: string,
		data: {
			id: string;
			parentTrackId: string;
			notes?: string | null;
		},
	) =>
		fetchWithAuth<TrackDerivation>(`/api/admin/tracks/${trackId}/derivations`, {
			method: "POST",
			body: JSON.stringify(data),
		}),
	delete: (trackId: string, id: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/tracks/${trackId}/derivations/${id}`,
			{
				method: "DELETE",
			},
		),
};

// Track Publications (トラック公開リンク)
export interface TrackPublication {
	id: string;
	trackId: string;
	platformCode: string;
	url: string;
	createdAt: Date | null;
	updatedAt: Date | null;
	platform?: Platform | null;
}

export const trackPublicationsApi = {
	list: (trackId: string) =>
		fetchWithAuth<TrackPublication[]>(
			`/api/admin/tracks/${trackId}/publications`,
		),
	create: (
		trackId: string,
		data: {
			id: string;
			platformCode: string;
			url: string;
		},
	) =>
		fetchWithAuth<TrackPublication>(
			`/api/admin/tracks/${trackId}/publications`,
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
	update: (
		trackId: string,
		id: string,
		data: {
			url?: string;
		},
	) =>
		fetchWithAuth<TrackPublication>(
			`/api/admin/tracks/${trackId}/publications/${id}`,
			{
				method: "PUT",
				body: JSON.stringify(data),
			},
		),
	delete: (trackId: string, id: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/tracks/${trackId}/publications/${id}`,
			{
				method: "DELETE",
			},
		),
};

// Track ISRCs
export interface TrackIsrc {
	id: string;
	trackId: string;
	isrc: string;
	isPrimary: boolean;
	createdAt: Date | null;
	updatedAt: Date | null;
	assignedAt?: string | null;
	source?: string | null;
}

export const trackIsrcsApi = {
	list: (trackId: string) =>
		fetchWithAuth<TrackIsrc[]>(`/api/admin/tracks/${trackId}/isrcs`),
	create: (
		trackId: string,
		data: {
			id: string;
			isrc: string;
			isPrimary?: boolean;
		},
	) =>
		fetchWithAuth<TrackIsrc>(`/api/admin/tracks/${trackId}/isrcs`, {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (
		trackId: string,
		id: string,
		data: {
			isPrimary?: boolean;
		},
	) =>
		fetchWithAuth<TrackIsrc>(`/api/admin/tracks/${trackId}/isrcs/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (trackId: string, id: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/tracks/${trackId}/isrcs/${id}`,
			{
				method: "DELETE",
			},
		),
};

// Release Publications (リリース公開リンク)
export interface ReleasePublication {
	id: string;
	releaseId: string;
	platformCode: string;
	url: string;
	createdAt: Date | null;
	updatedAt: Date | null;
	platform?: Platform | null;
}

export const releasePublicationsApi = {
	list: (releaseId: string) =>
		fetchWithAuth<ReleasePublication[]>(
			`/api/admin/releases/${releaseId}/publications`,
		),
	create: (
		releaseId: string,
		data: {
			id: string;
			platformCode: string;
			url: string;
		},
	) =>
		fetchWithAuth<ReleasePublication>(
			`/api/admin/releases/${releaseId}/publications`,
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
	update: (
		releaseId: string,
		id: string,
		data: {
			url?: string;
		},
	) =>
		fetchWithAuth<ReleasePublication>(
			`/api/admin/releases/${releaseId}/publications/${id}`,
			{
				method: "PUT",
				body: JSON.stringify(data),
			},
		),
	delete: (releaseId: string, id: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/releases/${releaseId}/publications/${id}`,
			{
				method: "DELETE",
			},
		),
};

// Release JAN Codes
export interface ReleaseJanCode {
	id: string;
	releaseId: string;
	janCode: string;
	label: string | null;
	isPrimary: boolean;
	countryCode: string | null;
	createdAt: Date | null;
	updatedAt: Date | null;
}

export const releaseJanCodesApi = {
	list: (releaseId: string) =>
		fetchWithAuth<ReleaseJanCode[]>(
			`/api/admin/releases/${releaseId}/jan-codes`,
		),
	create: (
		releaseId: string,
		data: {
			id: string;
			janCode: string;
			label?: string | null;
			isPrimary?: boolean;
			countryCode?: string | null;
		},
	) =>
		fetchWithAuth<ReleaseJanCode>(
			`/api/admin/releases/${releaseId}/jan-codes`,
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
	update: (
		releaseId: string,
		id: string,
		data: {
			label?: string | null;
			isPrimary?: boolean;
			countryCode?: string | null;
		},
	) =>
		fetchWithAuth<ReleaseJanCode>(
			`/api/admin/releases/${releaseId}/jan-codes/${id}`,
			{
				method: "PUT",
				body: JSON.stringify(data),
			},
		),
	delete: (releaseId: string, id: string) =>
		fetchWithAuth<{ success: boolean; id: string }>(
			`/api/admin/releases/${releaseId}/jan-codes/${id}`,
			{
				method: "DELETE",
			},
		),
};

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

export interface Platform {
	code: string;
	name: string;
	category: string | null;
	urlPattern: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface AliasType {
	code: string;
	label: string;
	description: string | null;
}

export interface CreditRole {
	code: string;
	label: string;
	description: string | null;
}

export interface OfficialWorkCategory {
	code: string;
	name: string;
	description: string | null;
}

export interface OfficialWork {
	id: string;
	categoryCode: string;
	name: string;
	nameJa: string;
	nameEn: string | null;
	shortNameJa: string | null;
	shortNameEn: string | null;
	seriesCode: string | null;
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
	name: string;
	nameJa: string;
	nameEn: string | null;
	themeType: string | null;
	composerName: string | null;
	isOfficialArrangement: boolean;
	sourceSongId: string | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
	workName?: string | null;
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
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
}

async function fetchWithAuth<T>(
	endpoint: string,
	options?: RequestInit,
): Promise<T> {
	const res = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
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
		fetchWithAuth<{ success: boolean }>(`/api/admin/master/platforms/${code}`, {
			method: "DELETE",
		}),
};

// Alias Types
export const aliasTypesApi = {
	list: (params?: { page?: number; limit?: number; search?: string }) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.search) searchParams.set("search", params.search);
		const query = searchParams.toString();
		return fetchWithAuth<PaginatedResponse<AliasType>>(
			`/api/admin/master/alias-types${query ? `?${query}` : ""}`,
		);
	},
	get: (code: string) =>
		fetchWithAuth<AliasType>(`/api/admin/master/alias-types/${code}`),
	create: (data: AliasType) =>
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
		fetchWithAuth<{ success: boolean }>(
			`/api/admin/master/alias-types/${code}`,
			{
				method: "DELETE",
			},
		),
};

// Credit Roles
export const creditRolesApi = {
	list: (params?: { page?: number; limit?: number; search?: string }) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.search) searchParams.set("search", params.search);
		const query = searchParams.toString();
		return fetchWithAuth<PaginatedResponse<CreditRole>>(
			`/api/admin/master/credit-roles${query ? `?${query}` : ""}`,
		);
	},
	get: (code: string) =>
		fetchWithAuth<CreditRole>(`/api/admin/master/credit-roles/${code}`),
	create: (data: CreditRole) =>
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
		fetchWithAuth<{ success: boolean }>(
			`/api/admin/master/credit-roles/${code}`,
			{
				method: "DELETE",
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

export const officialWorkCategoriesApi = {
	list: (params?: { page?: number; limit?: number; search?: string }) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.search) searchParams.set("search", params.search);
		const query = searchParams.toString();
		return fetchWithAuth<PaginatedResponse<OfficialWorkCategory>>(
			`/api/admin/master/official-work-categories${query ? `?${query}` : ""}`,
		);
	},
	get: (code: string) =>
		fetchWithAuth<OfficialWorkCategory>(
			`/api/admin/master/official-work-categories/${code}`,
		),
	create: (data: OfficialWorkCategory) =>
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
		fetchWithAuth<{ success: boolean }>(
			`/api/admin/master/official-work-categories/${code}`,
			{
				method: "DELETE",
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
		fetchWithAuth<{ success: boolean }>(`/api/admin/official/works/${id}`, {
			method: "DELETE",
		}),
};

// Official Songs
export const officialSongsApi = {
	list: (params?: {
		page?: number;
		limit?: number;
		workId?: string;
		themeType?: string;
		search?: string;
	}) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.workId) searchParams.set("workId", params.workId);
		if (params?.themeType) searchParams.set("themeType", params.themeType);
		if (params?.search) searchParams.set("search", params.search);
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
		fetchWithAuth<{ success: boolean }>(`/api/admin/official/songs/${id}`, {
			method: "DELETE",
		}),
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
	get: (id: string) => fetchWithAuth<Artist>(`/api/admin/artists/${id}`),
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
		fetchWithAuth<{ success: boolean }>(`/api/admin/artists/${id}`, {
			method: "DELETE",
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
		fetchWithAuth<{ success: boolean }>(`/api/admin/artist-aliases/${id}`, {
			method: "DELETE",
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
		fetchWithAuth<{ success: boolean }>(`/api/admin/circles/${id}`, {
			method: "DELETE",
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
		fetchWithAuth<{ success: boolean }>(
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
	eventSeriesId: string;
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

// Event Series
export const eventSeriesApi = {
	list: (params?: { search?: string }) => {
		const searchParams = new URLSearchParams();
		if (params?.search) searchParams.set("search", params.search);
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
		fetchWithAuth<{ success: boolean }>(`/api/admin/event-series/${id}`, {
			method: "DELETE",
		}),
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
		fetchWithAuth<{ success: boolean }>(`/api/admin/events/${id}`, {
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
		fetchWithAuth<{ success: boolean }>(
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
	catalogNumber: string | null;
	releaseDate: string | null;
	releaseType: ReleaseType | null;
	eventDayId: string | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ReleaseWithDiscCount extends Release {
	discCount: number;
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
		return fetchWithAuth<PaginatedResponse<ReleaseWithDiscCount>>(
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
		fetchWithAuth<{ success: boolean }>(`/api/admin/releases/${id}`, {
			method: "DELETE",
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
		fetchWithAuth<{ success: boolean }>(
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
		fetchWithAuth<{ success: boolean }>(
			`/api/admin/releases/${releaseId}/circles/${circleId}?participationType=${encodeURIComponent(participationType)}`,
			{
				method: "DELETE",
			},
		),
};

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
	}) => {
		const searchParams = new URLSearchParams();
		if (params?.page) searchParams.set("page", String(params.page));
		if (params?.limit) searchParams.set("limit", String(params.limit));
		if (params?.category) searchParams.set("category", params.category);
		if (params?.search) searchParams.set("search", params.search);
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

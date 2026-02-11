export const MAX_SEARCH_LENGTH = 200;

export function sanitizeSearch(
	raw: string | undefined,
	maxLength: number = MAX_SEARCH_LENGTH,
): string | undefined {
	if (!raw) return undefined;
	return raw.slice(0, maxLength);
}

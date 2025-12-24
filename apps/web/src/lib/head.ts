export const APP_NAME = "東方編曲録";

export function createPageHead(pageTitle?: string) {
	return {
		meta: [{ title: pageTitle ? `${pageTitle} | ${APP_NAME}` : APP_NAME }],
	};
}

export function createTrackDetailHead(
	trackName?: string,
	releaseName?: string,
) {
	const subtitle =
		trackName && releaseName ? `${trackName} - ${releaseName}` : "読み込み中";
	return {
		meta: [{ title: `トラック詳細：${subtitle} | ${APP_NAME}` }],
	};
}

export function createReleaseDetailHead(releaseName?: string) {
	const subtitle = releaseName || "読み込み中";
	return {
		meta: [{ title: `作品詳細：${subtitle} | ${APP_NAME}` }],
	};
}

export function createArtistDetailHead(artistName?: string) {
	const subtitle = artistName || "読み込み中";
	return {
		meta: [{ title: `アーティスト詳細：${subtitle} | ${APP_NAME}` }],
	};
}

export function createCircleDetailHead(circleName?: string) {
	const subtitle = circleName || "読み込み中";
	return {
		meta: [{ title: `サークル詳細：${subtitle} | ${APP_NAME}` }],
	};
}

export function createEventDetailHead(eventName?: string) {
	const subtitle = eventName || "読み込み中";
	return {
		meta: [{ title: `イベント詳細：${subtitle} | ${APP_NAME}` }],
	};
}

export function createEventSeriesDetailHead(seriesName?: string) {
	const subtitle = seriesName || "読み込み中";
	return {
		meta: [{ title: `イベントシリーズ詳細：${subtitle} | ${APP_NAME}` }],
	};
}

export function createMasterDetailHead(masterType: string, itemName?: string) {
	const subtitle = itemName || "読み込み中";
	return {
		meta: [{ title: `${masterType}詳細：${subtitle} | ${APP_NAME}` }],
	};
}

export function createArtistAliasDetailHead(aliasName?: string) {
	const subtitle = aliasName || "読み込み中";
	return {
		meta: [{ title: `名義詳細：${subtitle} | ${APP_NAME}` }],
	};
}

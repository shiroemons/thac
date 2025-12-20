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

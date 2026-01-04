/**
 * 数値を3桁区切りでフォーマットする
 * toLocaleString()はサーバーとクライアントでロケールが異なる場合に
 * ハイドレーションエラーを引き起こすため、一貫したフォーマットを使用する
 */
export function formatNumber(n: number): string {
	return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

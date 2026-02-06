/**
 * DATABASE_SSL環境変数によるSSL設定の明示的制御
 * - "disable" | "false": SSL無効
 * - "require": SSL必須
 * - 未設定: URL自動検出（ローカルアドレス → false、リモート → "require"）
 */
export function resolveSslConfig(url: string): false | "require" {
	const sslEnv = process.env.DATABASE_SSL;
	if (sslEnv === "disable" || sslEnv === "false") return false;
	if (sslEnv === "require") return "require";
	// 自動検出: ローカルアドレスパターン
	const isLocal =
		url.includes("localhost") ||
		url.includes("127.0.0.1") ||
		url.includes("[::1]") ||
		url.startsWith("postgresql:///");
	return isLocal ? false : "require";
}

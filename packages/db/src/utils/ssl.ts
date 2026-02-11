/**
 * DATABASE_SSL環境変数によるSSL設定の明示的制御
 * - "disable" | "false": SSL無効
 * - "require": SSL必須（サーバー証明書の検証なし）
 * - "verify-full": SSL必須 + サーバー証明書の完全検証（CA検証 + ホスト名一致）
 * - 未設定: URL自動検出（ローカルアドレス → false、リモート → "require"）
 */
export function resolveSslConfig(
	url: string,
): false | "require" | "verify-full" {
	const sslEnv = process.env.DATABASE_SSL;
	if (sslEnv === "disable" || sslEnv === "false") return false;
	if (sslEnv === "require") return "require";
	if (sslEnv === "verify-full") return "verify-full";
	// 自動検出: ローカルアドレスパターン
	const isLocal =
		url.includes("localhost") ||
		url.includes("127.0.0.1") ||
		url.includes("[::1]") ||
		url.startsWith("postgresql:///");
	return isLocal ? false : "require";
}

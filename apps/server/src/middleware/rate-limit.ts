import type { Context, Next } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { ERROR_MESSAGES } from "../constants/error-messages";

const isDev = process.env.NODE_ENV === "development";
const multiplier = isDev ? 10 : 1;

// キー生成: ユーザーID優先、フォールバックはIP
const keyGenerator = (c: Context) =>
	c.get("user")?.id ?? c.req.header("x-forwarded-for") ?? "anonymous";

// GET用（100リクエスト/分）
const readRateLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 100 * multiplier,
	standardHeaders: "draft-6",
	keyGenerator,
	message: { error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED },
});

// POST/PUT/PATCH用（30リクエスト/分）
const writeRateLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 30 * multiplier,
	standardHeaders: "draft-6",
	keyGenerator,
	message: { error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED },
});

// DELETE用（20リクエスト/分）
const deleteRateLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 20 * multiplier,
	standardHeaders: "draft-6",
	keyGenerator,
	message: { error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED },
});

// バッチ操作用（10リクエスト/分）
const batchRateLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 10 * multiplier,
	standardHeaders: "draft-6",
	keyGenerator,
	message: { error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED },
});

/**
 * HTTPメソッド・パス別のレート制限ミドルウェア
 * 認証ミドルウェアの後に適用することで、ユーザーIDでレート制限を適用可能
 */
export async function methodRateLimiter(c: Context, next: Next) {
	const method = c.req.method;
	const path = c.req.path;

	if (method === "GET") {
		return readRateLimiter(c, next);
	}
	if (method === "POST" || method === "PUT" || method === "PATCH") {
		return writeRateLimiter(c, next);
	}
	if (method === "DELETE") {
		// バッチ操作は厳しい制限
		if (path.includes("/batch")) {
			return batchRateLimiter(c, next);
		}
		return deleteRateLimiter(c, next);
	}

	return next();
}

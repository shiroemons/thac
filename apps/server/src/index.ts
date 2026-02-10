import "dotenv/config";
import { auth } from "@thac/auth";
import { cleanup } from "@thac/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRateLimiter, methodRateLimiter } from "./middleware/rate-limit";
import { adminRouter } from "./routes/admin";
import { publicRouter } from "./routes/public";

if (process.env.NODE_ENV === "production") {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret || secret === "your-secret-key" || secret.length < 32) {
		throw new Error(
			"BETTER_AUTH_SECRET must be set to a strong value in production (min 32 chars)",
		);
	}
}

if (process.env.NODE_ENV === "production") {
	const corsOrigin = process.env.CORS_ORIGIN;
	if (!corsOrigin) {
		throw new Error(
			"CORS_ORIGIN must be set in production (e.g. https://your-domain.com)",
		);
	}
}

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: process.env.CORS_ORIGIN || "",
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		exposeHeaders: ["Content-Disposition"],
		credentials: true,
	}),
);

app.use("/api/auth/*", authRateLimiter);
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// 公開API（認証不要）
app.use("/api/public/*", methodRateLimiter);
app.route("/api/public", publicRouter);

// 管理者API
app.route("/api/admin", adminRouter);

app.get("/", (c) => {
	return c.text("OK");
});

const shutdown = async () => {
	console.log("Shutting down gracefully...");
	const timeoutId = setTimeout(() => {
		console.error("Shutdown timeout, forcing exit");
		process.exit(1);
	}, 10000);
	try {
		await cleanup();
		console.log("Server stopped");
	} finally {
		clearTimeout(timeoutId);
		process.exit(0);
	}
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("uncaughtException", (err) => {
	console.error("Uncaught exception:", err);
	shutdown();
});
process.on("unhandledRejection", (reason) => {
	console.error("Unhandled rejection:", reason);
	shutdown();
});

export default {
	port: 3001,
	fetch: app.fetch,
};

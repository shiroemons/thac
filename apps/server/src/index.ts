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
	await cleanup();
	console.log("Server stopped");
	process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default {
	port: 3001,
	fetch: app.fetch,
};

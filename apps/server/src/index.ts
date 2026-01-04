import "dotenv/config";
import { auth } from "@thac/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { adminRouter } from "./routes/admin";
import { publicRouter } from "./routes/public";

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

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// 公開API（認証不要）
app.route("/api/public", publicRouter);

// 管理者API
app.route("/api/admin", adminRouter);

app.get("/", (c) => {
	return c.text("OK");
});

export default app;

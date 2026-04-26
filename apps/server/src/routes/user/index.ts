import { Hono } from "hono";
import { methodRateLimiter } from "../../middleware/rate-limit";
import {
	requireUserMiddleware,
	type UserAuthContext,
} from "../../middleware/user-auth";
import { albumRequestsUserRouter } from "./album-requests";

const userRouter = new Hono<UserAuthContext>();

// ユーザー認証ミドルウェアを適用
userRouter.use("/*", requireUserMiddleware);

// レート制限ミドルウェアを適用（認証後）
userRouter.use("/*", methodRateLimiter);

// アルバム申請ルート
userRouter.route("/album-requests", albumRequestsUserRouter);

export { userRouter };

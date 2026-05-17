---
paths: apps/server/**
---

# サーバー（Hono API）

## 概要

Node.js上で動作するHono APIサーバー（http://localhost:3001）

## 依存パッケージ

- `@thac/auth`: 認証処理
- `@thac/db`: データベースアクセス

## ディレクトリ構成

```
apps/server/
├── src/
│   ├── index.ts              # エントリーポイント
│   ├── routes/               # APIルート
│   │   ├── public/           # 認証不要
│   │   └── admin/            # 認証必須
│   ├── middleware/
│   │   └── rate-limit.ts     # レート制限
│   ├── utils/
│   │   ├── api-error.ts      # エラーハンドリング
│   │   ├── db-retry.ts       # リトライロジック
│   │   └── cache.ts          # キャッシュ
│   └── constants/
│       └── error-messages.ts # エラーメッセージ定義
├── package.json
└── tsdown.config.ts
```

## 開発ガイドライン

- APIエンドポイントは`src/routes/`配下に配置
- 認証が必要なエンドポイントは`@thac/auth`を使用
- データベースアクセスは`@thac/db`経由で行う

## PostgreSQLエラーハンドリング

DB操作は`handleDbError(c, error, operation)`で統一処理。エラーコードからHTTPステータスへのマッピング:

| PGコード | 意味 | HTTPステータス | ErrorCode |
|---------|------|--------------|-----------|
| `23505` | UNIQUE違反 | 409 Conflict | `DUPLICATE` |
| `23503` | FK違反 | 400 Bad Request | `VALIDATION_ERROR` |
| `23514` | CHECK違反 | 400 Bad Request | `VALIDATION_ERROR` |
| `23502` | NOT NULL違反 | 400 Bad Request | `VALIDATION_ERROR` |
| `57014` | クエリタイムアウト | 503 Service Unavailable | `SERVICE_UNAVAILABLE` |
| `08003/08006/57P03` | 接続エラー | 503 Service Unavailable | `SERVICE_UNAVAILABLE` |

- 開発環境（`NODE_ENV=development`）のみ`details`に詳細情報を含める
- `isPostgresError()`でダックタイピング判定（`error.code`の存在チェック）

## リトライロジック

一時的DBエラーには`withDbRetry()`で指数バックオフリトライ:

```typescript
const result = await withDbRetry(
  () => db.select().from(table),
  { operation: "fetchItems", maxRetries: 3 }
);
```

リトライ対象エラーコード:

| コード | 意味 |
|-------|------|
| `08003` | connection_does_not_exist |
| `08006` | connection_failure |
| `57P03` | cannot_connect_now |
| `57014` | query_canceled（タイムアウト） |
| `40001` | serialization_failure |
| `40P01` | deadlock_detected |

設定: `baseDelay=100ms`, `maxDelay=5000ms`, 指数バックオフ（`baseDelay * 2^attempt`）

## グレースフルシャットダウン

SIGTERM/SIGINT/uncaughtException/unhandledRejection時にDB接続をクリーンアップ:

`clearInterval` → `cleanup()` → `process.exit(0)`（10秒タイムアウトで強制終了）

## 本番環境バリデーション

起動時に必須環境変数を検証（不正値で即クラッシュ）:

| 変数 | 条件 |
|------|------|
| `BETTER_AUTH_SECRET` | 32文字以上、`your-secret-key`不可 |
| `CORS_ORIGIN` | 必須（`https://your-domain.com`形式） |

## レート制限

`methodRateLimiter`でHTTPメソッド別に制限:

- 公開API: `/api/public/*` に適用
- 認証API: `/api/auth/*` に`authRateLimiter`を適用

## クエリパラメータサニタイズ

検索文字列はDoS防止のため長さ制限を適用。`sanitizeSearch()`で統一処理。

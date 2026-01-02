# Technology Stack

## Architecture

Turborepoによるモノレポ構成のフルスタックアプリケーション。フロントエンド（apps/web）とバックエンド（apps/server）を分離し、共有パッケージ（packages/）で認証とデータベースロジックを再利用可能にしている。

## Core Technologies

- **Language**: TypeScript（strict mode）
- **Runtime**: Bun 1.2+
- **Package Manager**: Bun（workspace catalog機能で依存関係バージョンを共有）
- **Monorepo Tool**: Turborepo

## Key Libraries

### Frontend (apps/web)
- **Framework**: TanStack Start（SSR）
- **Routing**: TanStack Router（ファイルベースルーティング）
- **State**: TanStack Query（サーバー状態管理）
- **UI**: React 19 + daisyUI + TailwindCSS v4
- **ドラッグ&ドロップ**: @dnd-kit

### Backend (apps/server)
- **Framework**: Hono
- **Build**: tsdown

### Shared
- **ORM**: Drizzle ORM
- **Database**: SQLite（Turso/libsql）
- **Auth**: Better-Auth
- **Validation**: Zod v4
- **ID生成**: nanoid（プレフィックス付きID）
- **日付処理**: date-fns
- **トースト通知**: sonner

## Development Standards

### Type Safety
- TypeScript strict modeを使用
- Zodによるランタイムバリデーション

### Code Quality
- Biomeによるlint/フォーマット
- インデント: タブ
- クォート: ダブルクォート
- import自動整理有効
- Lefthookによるgit hooksの自動実行

### Testing
- Bun Test Runner（サーバー側統合テスト）
- Testing Library（React コンポーネントテスト）

#### サーバー統合テスト

`apps/server/test/` に統合テストインフラを配置:

```bash
# テスト実行
bun test                # 全テスト
bun test --watch        # ウォッチモード
bun test --coverage     # カバレッジ付き
```

**テストヘルパー**:
- `test-app.ts`: テスト用アプリケーションインスタンス
- `test-db.ts`: インメモリSQLiteセットアップ
- `test-auth.ts`: 管理者認証モック
- `test-response.ts`: 型安全なレスポンスアサーション（`expectSuccess`, `expectCreated`, `expectNotFound`等）
- `fixtures.ts`: テストデータ生成ユーティリティ

## Development Environment

### Required Tools
- Bun 1.2+
- Turso CLI（ローカルDB用）

### Common Commands
```bash
# Dev: 全アプリ起動
bun run dev

# Build: 全アプリビルド
bun run build

# Lint/Format: チェックと修正
bun run check

# Type Check
bun run check-types

# DB: ローカル起動
cd packages/db && bun run db:local
```

## API Error Handling

### 統一エラーメッセージ

`apps/server/src/constants/error-messages.ts`で全APIエンドポイント共通のエラーメッセージを定義。

```typescript
import { ERROR_MESSAGES } from "../constants/error-messages";

// 使用例
return c.json({ error: ERROR_MESSAGES.NOT_FOUND }, 404);
return c.json({ error: ERROR_MESSAGES.VALIDATION_FAILED, details: errors }, 400);
```

### エラーカテゴリ

| カテゴリ | HTTPステータス | 例 |
|---------|--------------|-----|
| Not Found | 404 | `ARTIST_NOT_FOUND`, `TRACK_NOT_FOUND` |
| 重複エラー | 409 | `ID_ALREADY_EXISTS`, `NAME_ALREADY_EXISTS` |
| バリデーション | 400 | `VALIDATION_FAILED`, `INVALID_DIRECTION` |
| 削除制約 | 409 | `CANNOT_DELETE_SERIES_WITH_EVENTS` |
| DB障害 | 500 | `DB_ERROR` |

### エラーハンドリングユーティリティ

```typescript
import { handleDbError } from "../utils/api-error";

// DB操作でエラーが発生した場合の統一ハンドリング
try {
  await db.insert(table).values(data);
} catch (e) {
  return handleDbError(c, e);
}
```

## Rate Limiting

### 概要

管理API（`/api/admin/*`）にレート制限を適用し、DoS攻撃や過剰なリクエストを防止。

### 制限値

| 操作 | 制限（本番） | 制限（開発） |
|------|-------------|-------------|
| GET（一覧・詳細） | 100/分 | 1000/分 |
| POST/PUT/PATCH（作成・更新） | 30/分 | 300/分 |
| DELETE（通常） | 20/分 | 200/分 |
| DELETE（バッチ: `/batch`） | 10/分 | 100/分 |

### 実装

```typescript
// apps/server/src/middleware/rate-limit.ts
import { rateLimiter } from "hono-rate-limiter";

// ユーザーID優先、IPフォールバックでキー生成
const keyGenerator = (c: Context) =>
  c.get("user")?.id ?? c.req.header("x-forwarded-for") ?? "anonymous";

// 例: GET用
const readRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-6",
  keyGenerator,
  message: { error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED },
});
```

### レスポンスヘッダー

`standardHeaders: "draft-6"` により以下のヘッダーを返却:

- `RateLimit-Limit`: 制限値
- `RateLimit-Remaining`: 残りリクエスト数
- `RateLimit-Reset`: リセットまでの秒数

### 429エラー

制限超過時は HTTP 429 と以下のJSONを返却:

```json
{ "error": "リクエスト数が上限を超えました。しばらくしてから再試行してください" }
```

## Key Technical Decisions

- **Bunランタイム採用**: 高速な起動と実行、ネイティブTypeScriptサポート
- **Turborepoモノレポ**: 効率的なキャッシュとパラレルビルド
- **TanStack Start**: Next.jsの代替としてのReact SSRフレームワーク
- **Drizzle ORM**: TypeScriptファーストで軽量なSQLクエリビルダー
- **Biome**: ESLint + Prettierの統合代替として高速なツールチェーン
- **統一エラーメッセージ**: 集中管理された日本語エラーメッセージで一貫したUX

---
_Document standards and patterns, not every dependency_

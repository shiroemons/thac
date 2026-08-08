# Technology Stack

## Architecture

Turborepoによるモノレポ構成のフルスタックアプリケーション。フロントエンド（apps/web）とバックエンド（apps/server）を分離し、共有パッケージ（packages/）で認証とデータベースロジックを再利用可能にしている。

## Core Technologies

- **Language**: TypeScript（strict mode）
- **Runtime**: Node.js 24.18.1
- **Package Manager**: pnpm 11.20.0（workspace catalog機能で依存関係バージョンを共有）
- **Monorepo Tool**: Turborepo

## Key Libraries

### Frontend (apps/web)
- **Framework**: TanStack Start（SSR）
- **Routing**: TanStack Router（ファイルベースルーティング）
- **State**: TanStack Query（サーバー状態管理）
- **Forms**: TanStack Form（フォーム状態管理）
- **UI**: React 19 + daisyUI + TailwindCSS v4
- **Charts**: Nivo（統計・ランキング表示）
- **ドラッグ&ドロップ**: @dnd-kit

### Backend (apps/server)
- **Framework**: Hono
- **Build**: tsdown

### Shared
- **ORM**: Drizzle ORM + drizzle-zod（スキーマ検証）
- **Database**: PostgreSQL
- **Auth**: Better-Auth（メール/パスワード + OAuth: Google, Discord, GitHub）
- **Validation**: Zod v4
- **ID生成**: TypeID（プレフィックス + UUIDv7ベース、時系列ソート可能）
- **日付処理**: date-fns

### Search
- **Search Engine**: Meilisearch 1.51.0
- **用途**: アーティスト、サークル、楽曲等の全文検索
- **ポート**: 7700（開発環境）

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
- markuplintによるHTML品質チェック（React/JSX対応）
- eslint-plugin-validate-jsx-nestingによるJSXネスト検証

### Testing
- Vitest（サーバー側統合テスト）
- Testing Library（React コンポーネントテスト）

#### サーバー統合テスト

`apps/server/test/` に統合テストインフラを配置:

```bash
# テスト実行
task test                # 全テスト
task test:watch          # ウォッチモード
task test:coverage       # カバレッジ付き
```

**テストヘルパー**:
- `test-app.ts`: テスト用アプリケーションインスタンス
- `test-db.ts`: PGliteインメモリPostgreSQLセットアップ
- `test-auth.ts`: 管理者認証モック
- `test-response.ts`: 型安全なレスポンスアサーション（`expectSuccess`, `expectCreated`, `expectNotFound`等）
- `fixtures.ts`: テストデータ生成ユーティリティ

## Development Environment

### mise + Task + devbox（標準開発環境）

miseはTaskとDevboxを管理し、プロジェクト移動時にDevboxの実行環境を現在のシェルへ読み込む。Taskfile内でも一時的な操作でもコマンドを直接実行できる。

```bash
# サービス起動（web + server + meilisearch）
task up

# 開発サーバー起動
task dev

# ビルド
task build

# Lint/Format
task check

# 型チェック
task check-types

# 任意のコマンド実行
pnpm install --frozen-lockfile
pnpm dlx @hono/cli docs
```

### Required Tools
- mise（Task・Devboxのバージョン管理と環境自動読込）
- Task（タスクランナー、miseからインストール）
- devbox（Nixベースの開発ツール管理、miseからインストール）
- Node.js 24.18.1 / pnpm 11.20.0（devbox.json / package.json で管理）

### データディレクトリ
- `.devbox/virtenv/postgresql_18/data/` - PostgreSQLデータ（devboxプラグイン管理）
- `data/meilisearch/` - Meilisearchインデックス

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

## Page Metadata (SEO)

### Head Utility

`apps/web/src/lib/head.ts`でページタイトルを一元管理:

```typescript
import { createPageHead, createPublicArtistHead } from "@/lib/head";

// 一覧ページ
export const Route = createFileRoute("/_public/artists")({
  head: () => createPageHead("アーティスト"),
  component: ArtistsPage,
});

// 詳細ページ（loaderDataを使用）
export const Route = createFileRoute("/_public/artists_/$id")({
  loader: ({ params }) => fetchArtist(params.id),
  head: ({ loaderData }) => createPublicArtistHead(loaderData?.name),
  component: ArtistDetailPage,
});
```

### タイトル形式

| ページ種別 | 形式 | 例 |
|-----------|------|-----|
| 一覧（公開） | `{ページ名} \| 東方編曲録` | アーティスト \| 東方編曲録 |
| 詳細（公開） | `{カテゴリ}：{名前} \| 東方編曲録` | アーティスト：ZUN \| 東方編曲録 |
| 詳細（管理） | `{カテゴリ}詳細：{名前} \| 東方編曲録` | アーティスト詳細：ZUN \| 東方編曲録 |

## Key Technical Decisions

- **Node.jsランタイム採用**: GitHub Actions / Docker / devbox で同じ実行環境を維持
- **Turborepoモノレポ**: 効率的なキャッシュとパラレルビルド
- **TanStack Start**: Next.jsの代替としてのReact SSRフレームワーク
- **Drizzle ORM**: TypeScriptファーストで軽量なSQLクエリビルダー
- **Biome**: ESLint + Prettierの統合代替として高速なツールチェーン
- **統一エラーメッセージ**: 集中管理された日本語エラーメッセージで一貫したUX

---
_Document standards and patterns, not every dependency_

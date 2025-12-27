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
- Vitest（設定済み）
- Testing Library（React）

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

## Key Technical Decisions

- **Bunランタイム採用**: 高速な起動と実行、ネイティブTypeScriptサポート
- **Turborepoモノレポ**: 効率的なキャッシュとパラレルビルド
- **TanStack Start**: Next.jsの代替としてのReact SSRフレームワーク
- **Drizzle ORM**: TypeScriptファーストで軽量なSQLクエリビルダー
- **Biome**: ESLint + Prettierの統合代替として高速なツールチェーン

---
_Document standards and patterns, not every dependency_

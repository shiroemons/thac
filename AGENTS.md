# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 重要: コマンド実行ルール

**すべてのコマンドは devbox 経由で実行すること。**

```bash
# 正しい例
devbox run check-types
devbox run check
devbox run -- pnpm install --frozen-lockfile
devbox run -- pnpm dlx @hono/cli docs

# 間違った例（直接実行は禁止）
pnpm check-types
pnpm install
npx @hono/cli docs
```

## アーキテクチャ概要

Turborepoによるモノレポ構成のフルスタックWebアプリケーション。

### Apps
- **apps/web**: TanStack Start（SSR）、TanStack Router、TailwindCSS v4、daisyUIを使用したReactフロントエンド
- **apps/server**: Node.js上で動作するHono APIサーバー

### Packages（共有ライブラリ）
- **packages/db**: Drizzle ORMとPostgreSQL、`db`クライアントとスキーマをエクスポート
- **packages/auth**: Better-Auth設定、永続化に`@thac/db`を使用
- **packages/config**: 共有TypeScript設定（`tsconfig.base.json`）

### パッケージ依存関係
```
apps/web → @thac/auth
apps/server → @thac/auth, @thac/db
packages/auth → @thac/db
```

## ドキュメント参照

ライブラリのドキュメントを参照する際は、context7 MCP を使用して最新のドキュメントを取得すること。

```
# 使用例
1. resolve-library-id でライブラリIDを解決
2. get-library-docs でドキュメントを取得
```

### 主要ライブラリ
- TanStack Start / TanStack Router
- Hono（※ Hono CLI を優先して使用）
- Drizzle ORM
- Better-Auth
- TailwindCSS
- daisyUI

### Hono について

Hono に関する不明点は Hono CLI（`@hono/cli`）を使用すること。
context7 よりも Hono CLI を優先して使用する。

```bash
# ドキュメント参照（devbox経由で実行）
devbox run -- pnpm dlx @hono/cli docs [path]

# ドキュメント検索（devbox経由で実行）
devbox run -- pnpm dlx @hono/cli search <query>
```

## 図解の指示
- ユーザーに何かを説明する際は、簡単な図解を用いてわかりやすく説明すること
- ASCII アートやテキストベースの図を活用して視覚的に理解を助けること

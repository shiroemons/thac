# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## アーキテクチャ概要

Turborepoによるモノレポ構成のフルスタックWebアプリケーション。

### Apps
- **apps/web**: TanStack Start（SSR）、TanStack Router、TailwindCSS v4、daisyUIを使用したReactフロントエンド
- **apps/server**: Bun上で動作するHono APIサーバー

### Packages（共有ライブラリ）
- **packages/db**: Drizzle ORMとSQLite/Turso、`db`クライアントとスキーマをエクスポート
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
# ドキュメント参照
npx @hono/cli docs [path]

# ドキュメント検索
npx @hono/cli search <query>
```

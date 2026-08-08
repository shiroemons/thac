# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 重要: コマンド実行ルール

**プロジェクトの定型操作はTask経由で実行すること。miseがTaskとDevboxを管理し、プロジェクトへ移動するとDevbox環境を自動で現在のシェルへ読み込む。Taskにない一時的なコマンドは直接実行する。**

```bash
# 正しい例
task check-types
task check
task install
pnpm dlx @hono/cli docs

# 間違った例（ラッパーは不要）
devbox run -- pnpm install
mise exec -- pnpm install
npx @hono/cli docs
```

TaskとDevboxは`mise.toml`と`mise.lock`でバージョンを固定する。Node.js・pnpm・PostgreSQL・MeilisearchはDevboxで固定し、`scripts/mise/load-devbox.sh`から環境を読み込む。新しい定型操作は`Taskfile.yml`または`taskfiles/`へ追加し、Task内ではコマンドを直接実行する。`mise.toml`・Taskfile・`devbox.json`の責務を重複させないこと。

責務の境界は次のとおり。`mise`・`task`・`git`は開発環境を制御する側なので直接実行する。Node.js・pnpm・PostgreSQL・MeilisearchなどDevboxで管理するコマンドは、miseが現在のシェルへ読み込んだDevbox環境上で実行する。通常はこれらもコマンド名だけでよく、個別の`devbox run --`は不要。

## Gitステージングルール

`git add -A`と`git add .`は禁止。変更内容を確認したうえで、`git add -- <対象ファイル...>`のように対象ファイルを明示し、意図した差分だけをステージすること。`git add -p`も原則使用しない。同一ファイル内の差分を分ける必要がある場合は、ステージング前にユーザーへ確認すること。

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
# ドキュメント参照
pnpm dlx @hono/cli docs [path]

# ドキュメント検索
pnpm dlx @hono/cli search <query>
```

## 図解の指示
- ユーザーに何かを説明する際は、簡単な図解を用いてわかりやすく説明すること
- ASCII アートやテキストベースの図を活用して視覚的に理解を助けること

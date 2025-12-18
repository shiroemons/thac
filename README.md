# thac

このプロジェクトは [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack) で作成されました。React、TanStack Start、Honoなどを組み合わせたモダンなTypeScriptスタックです。

## 機能

- **TypeScript** - 型安全性と開発者体験の向上
- **TanStack Start** - TanStack Routerを使用したSSRフレームワーク
- **TailwindCSS** - 高速なUI開発のためのユーティリティファーストCSS
- **daisyUI** - Tailwind CSSベースのUIコンポーネント
- **Hono** - 軽量で高性能なサーバーフレームワーク
- **Bun** - ランタイム環境
- **Drizzle** - TypeScriptファーストのORM
- **SQLite/Turso** - データベースエンジン
- **Better-Auth** - 認証
- **Biome** - Lintとフォーマット
- **Turborepo** - 最適化されたモノレポビルドシステム
- **Lefthook** - Git hooksによるコミット前チェック

## はじめに

まず、依存関係をインストールします：

```bash
bun install
```

## データベースのセットアップ

このプロジェクトはDrizzle ORMとSQLiteを使用しています。

1. ローカルSQLiteデータベースを起動します：
```bash
cd packages/db && bun run db:local
```

2. 必要に応じて、`apps/server`ディレクトリの`.env`ファイルを適切な接続情報で更新します。

3. スキーマをデータベースに適用します：
```bash
bun run db:push
```

次に、開発サーバーを起動します：

```bash
bun run dev
```

ブラウザで [http://localhost:3001](http://localhost:3001) を開くとWebアプリケーションが表示されます。
APIは [http://localhost:3000](http://localhost:3000) で動作しています。

## プロジェクト構成

```
thac/
├── apps/
│   ├── web/         # フロントエンドアプリケーション（React + TanStack Start）
│   └── server/      # バックエンドAPI（Hono）
├── packages/
│   ├── auth/        # 認証設定とロジック
│   └── db/          # データベーススキーマとクエリ
```

## 利用可能なスクリプト

- `bun run dev`: 全アプリケーションを開発モードで起動
- `bun run build`: 全アプリケーションをビルド
- `bun run dev:web`: Webアプリケーションのみを起動
- `bun run dev:server`: サーバーのみを起動
- `bun run check-types`: 全アプリの型チェック
- `bun run db:push`: スキーマ変更をデータベースにプッシュ
- `bun run db:studio`: データベーススタジオUIを開く
- `cd packages/db && bun run db:local`: ローカルSQLiteデータベースを起動
- `bun run check`: Biomeによるフォーマットとlintを実行

## Git Hooks

このプロジェクトはlefthookを使用してpre-commitフックを設定しています。
`bun install`時に自動でhooksがインストールされます。

コミット前に以下が自動実行されます：

- **check-types**: 型チェック（`bun run check-types`）
- **biome**: Lintとフォーマット（`bun run check`）

エラーがある場合、コミットがブロックされます。

## 開発ワークフロー（cc-sdd）

本プロジェクトはSpec-Driven Development（仕様駆動開発）を採用しています。
Claude Codeのスラッシュコマンドを使用して、仕様策定から実装まで一貫したワークフローで開発を行います。

### ワークフロー概要

```
Phase 0: Steering（プロジェクト設定）
    ↓
Phase 1: Specification（仕様策定）
    spec-init → spec-requirements → spec-design → spec-tasks
    ↓
Phase 2: Implementation（実装）
    spec-impl
```

### スラッシュコマンド一覧

#### Phase 0: プロジェクト設定（オプション）

| コマンド | 説明 |
|---------|------|
| `/kiro:steering` | ステアリングドキュメントの管理 |
| `/kiro:steering-custom` | カスタムステアリングの作成 |

#### Phase 1: 仕様策定

| コマンド | 説明 |
|---------|------|
| `/kiro:spec-init "機能の説明"` | 新規仕様の初期化 |
| `/kiro:spec-requirements {feature}` | 要件定義の生成 |
| `/kiro:spec-design {feature} [-y]` | 技術設計の作成 |
| `/kiro:spec-tasks {feature} [-y]` | 実装タスクの生成 |

#### Phase 2: 実装

| コマンド | 説明 |
|---------|------|
| `/kiro:spec-impl {feature} [task-numbers]` | TDD方式で実装 |

#### バリデーション（オプション）

| コマンド | 説明 |
|---------|------|
| `/kiro:validate-gap {feature}` | 既存コードベースとのギャップ分析 |
| `/kiro:validate-design {feature}` | 技術設計のレビュー |
| `/kiro:validate-impl {feature}` | 実装の検証 |

#### 進捗確認

| コマンド | 説明 |
|---------|------|
| `/kiro:spec-status {feature}` | 仕様のステータスと進捗を表示 |

### ディレクトリ構成

```
.kiro/
├── steering/           # プロジェクト共通の方針
│   ├── product.md      # プロダクト概要
│   ├── tech.md         # 技術スタック
│   └── structure.md    # プロジェクト構造
└── specs/              # 機能ごとの仕様書
    └── {feature}/
        ├── spec.json       # メタデータ
        ├── requirements.md # 要件定義
        ├── design.md       # 技術設計
        └── tasks.md        # 実装タスク
```

### 開発フローの例

新機能「ユーザープロフィール」を追加する場合：

```bash
# 1. 仕様の初期化
/kiro:spec-init "ユーザープロフィール機能"

# 2. 要件定義（レビュー後に承認）
/kiro:spec-requirements user-profile

# 3. 技術設計（-y で自動承認、または対話式でレビュー）
/kiro:spec-design user-profile

# 4. 実装タスクの生成
/kiro:spec-tasks user-profile

# 5. 実装（TDD方式）
/kiro:spec-impl user-profile

# 進捗確認（いつでも実行可能）
/kiro:spec-status user-profile
```

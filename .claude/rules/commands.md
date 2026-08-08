# コマンド

**重要**: 定型操作はTask経由で実行すること。miseがDevbox環境を自動読込するため、Taskにない一時的なコマンドは直接実行する。

## ビルド・開発コマンド

```bash
# 依存関係のインストール
task install

# 全サービス起動（推奨）
task up

# 全アプリ（web + server）を開発モードで起動
task dev

# 個別アプリの起動
pnpm dev:web      # Webアプリ http://localhost:3000
pnpm dev:server   # APIサーバー http://localhost:3001

# 全アプリのビルド
task build

# 型チェック
task check-types

# Lint・フォーマット（Biome）
task check
```

## データベースコマンド

データベース操作はTaskfileで定義されている`task db:xxx`を使用する。

```bash
# スキーマをDBにプッシュ
task db:push

# マイグレーションを生成
task db:generate

# マイグレーションを実行
task db:migrate

# シードデータを投入
task db:seed

# DBセットアップ（push + seed）
task db:setup

# Drizzle Studioを起動
task db:studio

# マスタデータ・公式作品以外をトランケート
task db:truncate
```

## Meilisearch再インデックス

CLIコマンドは存在しない。再インデックスは管理画面またはAPIで実行する。

```
POST /api/admin/search/reindex          # 全インデックス再構築
POST /api/admin/search/reindex/:index   # 特定インデックス再構築（例: tracks）
```

レスポンスはSSE（Server-Sent Events）で進捗をストリーミング配信する。
Web管理画面（/admin）の検索管理ページから実行可能。

## devbox サービス管理

```bash
# 全サービス起動（バックグラウンド）
task up

# 全サービス起動（TUI付き）
task services:dev

# サービス停止
task down

# サービス再起動
task restart

# サービス状態
task status
```

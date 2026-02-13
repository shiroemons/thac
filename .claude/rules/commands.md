# コマンド

**重要**: すべてのコマンドは devbox 経由で実行すること。

## ビルド・開発コマンド

```bash
# 依存関係のインストール
devbox run install
# または
devbox run -- bun install

# 全サービス起動（推奨）
devbox services up

# 全アプリ（web + server）を開発モードで起動
devbox run dev

# 個別アプリの起動（devbox run -- bun run 経由）
devbox run -- bun run dev:web      # Webアプリ http://localhost:3000
devbox run -- bun run dev:server   # APIサーバー http://localhost:3001

# 全アプリのビルド
devbox run build

# 型チェック
devbox run check-types

# Lint・フォーマット（Biome）
devbox run check
```

## データベースコマンド

データベース操作は Makefile で定義されている `make db-xxx` を使用する。

```bash
# スキーマをDBにプッシュ
make db-push

# マイグレーションを生成
make db-generate

# マイグレーションを実行
make db-migrate

# シードデータを投入
make db-seed

# DBセットアップ（push + seed）
make db-setup

# Drizzle Studioを起動
make db-studio

# マスタデータ・公式作品以外をトランケート
make db-truncate
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
# 全サービス起動（TUI付き）
devbox services up

# バックグラウンド起動
devbox services up -b

# サービス停止
devbox services stop

# サービス再起動
devbox services restart
```

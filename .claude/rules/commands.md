# コマンド

**重要**: すべてのコマンドは devbox 経由で実行すること。

## ビルド・開発コマンド

```bash
# 依存関係のインストール
devbox run -- bun install

# 全サービス起動（推奨）
devbox services up

# 全アプリ（web + server）を開発モードで起動
devbox run dev

# 個別アプリの起動
devbox run dev:web      # Webアプリ http://localhost:3000
devbox run dev:server   # APIサーバー http://localhost:3001

# 全アプリのビルド
devbox run build

# 型チェック
devbox run check-types

# Lint・フォーマット（Biome）
devbox run check
```

## データベースコマンド

```bash
# スキーマをDBにプッシュ
devbox run db:push

# マイグレーションを生成
devbox run db:generate

# マイグレーションを実行
devbox run db:migrate

# シードデータを投入
devbox run db:seed

# Drizzle Studioを起動
devbox run db:studio
```

## Meilisearchコマンド

```bash
# Meilisearchのインデックスを同期
devbox run meilisearch:sync
```

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

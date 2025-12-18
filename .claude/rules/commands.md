# コマンド

## ビルド・開発コマンド

```bash
# 依存関係のインストール
bun install

# 全アプリ（web + server）を開発モードで起動
bun run dev

# 個別アプリの起動
bun run dev:web      # Webアプリ http://localhost:3001
bun run dev:server   # APIサーバー http://localhost:3000

# 全アプリのビルド
bun run build

# 型チェック
bun run check-types

# Lint・フォーマット（Biome）
bun run check
```

## データベースコマンド（Docker）

```bash
# ローカルSQLiteサーバーを起動（ローカル）
make db-local

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

# Drizzle Studioを起動（ローカル）
make db-studio
```

## データベースコマンド（ローカル）

```bash
# スキーマをDBにプッシュ
make db-push-local

# マイグレーションを生成
make db-generate-local

# マイグレーションを実行
make db-migrate-local

# シードデータを投入
make db-seed-local

# DBセットアップ（push + seed）
make db-setup-local
```

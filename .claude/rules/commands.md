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

## データベースコマンド

```bash
# ローカルSQLiteデータベースの起動（packages/dbディレクトリで実行）
cd packages/db && bun run db:local

# スキーマをデータベースにプッシュ
bun run db:push

# マイグレーション生成
bun run db:generate

# マイグレーション実行
bun run db:migrate

# Drizzle Studioを開く
bun run db:studio
```

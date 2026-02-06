# 技術スタック

## ランタイム・ツール

- **ランタイム**: Bun
- **パッケージマネージャー**: Bun（workspaceカタログで依存関係バージョンを共有）
- **Lint/フォーマット**: Biome（タブ、ダブルクォート）
- **データベース**: Drizzle ORMを介したPostgreSQL
- **認証**: Better-Auth（メール/パスワード）

## 環境変数

- `DATABASE_URL`: データベース接続URL
- `CORS_ORIGIN`: CORS許可オリジン（サーバー側）

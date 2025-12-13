# 技術スタック

## ランタイム・ツール

- **ランタイム**: Bun
- **パッケージマネージャー**: Bun（workspaceカタログで依存関係バージョンを共有）
- **Lint/フォーマット**: Biome（タブ、ダブルクォート）
- **データベース**: Drizzle ORMを介したSQLite（Turso/libsql）
- **認証**: Better-Auth（メール/パスワード）

## 環境変数

- `DATABASE_URL`: データベース接続URL
- `DATABASE_AUTH_TOKEN`: Turso認証トークン（本番環境用）
- `CORS_ORIGIN`: CORS許可オリジン（サーバー側）

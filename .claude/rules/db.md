---
paths: packages/db/**
---

# データベース（Drizzle ORM）

## 概要

Drizzle ORMを使用したSQLite（Turso/libsql）データベースパッケージ。

## ディレクトリ構成

```
packages/db/
├── src/
│   ├── index.ts        # dbクライアントのエクスポート
│   └── schema/
│       ├── index.ts    # スキーマのエクスポート
│       └── auth.ts     # 認証関連テーブル
├── drizzle.config.ts   # Drizzle設定
├── package.json
└── tsconfig.json
```

## コマンド（Docker）

```bash
make db-push       # スキーマをDBにプッシュ
make db-generate   # マイグレーションを生成
make db-migrate    # マイグレーションを実行
make db-seed       # シードデータを投入
make db-setup      # DBセットアップ（push + seed）
make db-studio     # Drizzle Studioを起動
```

## 開発ガイドライン

- スキーマは`src/schema/`配下に配置
- 新しいテーブルを追加したら`src/schema/index.ts`でエクスポート
- スキーマ変更後は`bun run db:generate`でマイグレーション生成
- `@thac/db`として他パッケージからインポート可能

## DB設計原則

- SQLアンチパターンを避ける（参考: 書籍「SQLアンチパターン」）
- 正規化を適切に行う
- 外部キー制約を活用する

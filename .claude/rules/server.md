---
paths: apps/server/**
---

# サーバー（Hono API）

## 概要

Bun上で動作するHono APIサーバー（http://localhost:3000）

## 依存パッケージ

- `@thac/auth`: 認証処理
- `@thac/db`: データベースアクセス

## ディレクトリ構成

```
apps/server/
├── src/
│   └── index.ts    # エントリーポイント
├── package.json
├── tsconfig.json
└── tsdown.config.ts
```

## 開発ガイドライン

- APIエンドポイントは`src/`配下に配置
- 認証が必要なエンドポイントは`@thac/auth`を使用
- データベースアクセスは`@thac/db`経由で行う

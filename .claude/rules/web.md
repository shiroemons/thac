---
paths: apps/web/**
---

# Webアプリ（TanStack Start）

## 概要

TanStack Start（SSR）ベースのReactフロントエンド（http://localhost:3001）

## 技術スタック

- **フレームワーク**: TanStack Start（SSR対応）
- **ルーティング**: TanStack Router
- **スタイリング**: TailwindCSS v4
- **UIコンポーネント**: shadcn/ui

## ディレクトリ構成

```
apps/web/src/
├── routes/           # ページルート（TanStack Router）
├── components/       # Reactコンポーネント
│   └── ui/          # shadcn/uiコンポーネント
├── lib/             # ユーティリティ
├── middleware/      # ミドルウェア
├── functions/       # サーバー関数
├── router.tsx       # ルーター設定
└── routeTree.gen.ts # 自動生成（編集禁止）
```

## 開発ガイドライン

- ルートは`src/routes/`に配置（TanStack Routerが自動検出）
- `routeTree.gen.ts`は自動生成されるため手動編集しない
- UIコンポーネントは`components/ui/`に配置（shadcn/ui）
- 認証クライアントは`lib/auth-client.ts`を使用

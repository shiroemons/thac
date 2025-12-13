# thac

このプロジェクトは [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack) で作成されました。React、TanStack Start、Honoなどを組み合わせたモダンなTypeScriptスタックです。

## 機能

- **TypeScript** - 型安全性と開発者体験の向上
- **TanStack Start** - TanStack Routerを使用したSSRフレームワーク
- **TailwindCSS** - 高速なUI開発のためのユーティリティファーストCSS
- **shadcn/ui** - 再利用可能なUIコンポーネント
- **Hono** - 軽量で高性能なサーバーフレームワーク
- **Bun** - ランタイム環境
- **Drizzle** - TypeScriptファーストのORM
- **SQLite/Turso** - データベースエンジン
- **Better-Auth** - 認証
- **Biome** - Lintとフォーマット
- **Turborepo** - 最適化されたモノレポビルドシステム

## はじめに

まず、依存関係をインストールします：

```bash
bun install
```

## データベースのセットアップ

このプロジェクトはDrizzle ORMとSQLiteを使用しています。

1. ローカルSQLiteデータベースを起動します：
```bash
cd packages/db && bun run db:local
```

2. 必要に応じて、`apps/server`ディレクトリの`.env`ファイルを適切な接続情報で更新します。

3. スキーマをデータベースに適用します：
```bash
bun run db:push
```

次に、開発サーバーを起動します：

```bash
bun run dev
```

ブラウザで [http://localhost:3001](http://localhost:3001) を開くとWebアプリケーションが表示されます。
APIは [http://localhost:3000](http://localhost:3000) で動作しています。

## プロジェクト構成

```
thac/
├── apps/
│   ├── web/         # フロントエンドアプリケーション（React + TanStack Start）
│   └── server/      # バックエンドAPI（Hono）
├── packages/
│   ├── auth/        # 認証設定とロジック
│   └── db/          # データベーススキーマとクエリ
```

## 利用可能なスクリプト

- `bun run dev`: 全アプリケーションを開発モードで起動
- `bun run build`: 全アプリケーションをビルド
- `bun run dev:web`: Webアプリケーションのみを起動
- `bun run dev:server`: サーバーのみを起動
- `bun run check-types`: 全アプリの型チェック
- `bun run db:push`: スキーマ変更をデータベースにプッシュ
- `bun run db:studio`: データベーススタジオUIを開く
- `cd packages/db && bun run db:local`: ローカルSQLiteデータベースを起動
- `bun run check`: Biomeによるフォーマットとlintを実行

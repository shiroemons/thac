# devbox 開発環境

**重要**: このプロジェクトではdevboxを標準の実行環境として使用する。
miseがdevboxをインストールし、その環境を現在のシェルへ自動で読み込む。定型操作はTask、一時的なコマンドは直接実行すること。

- 制御側の`mise`・`task`・`git`は直接実行する
- Devbox管理対象のNode.js・pnpm・PostgreSQL・Meilisearchなどは、miseが読み込んだDevbox環境上で実行する
- 通常の開発フローでは`devbox run --`を個別に付けない

## サービス構成

devbox services（process-compose）で以下のサービスが起動する：

| サービス | ポート | 説明 |
|---------|--------|------|
| postgresql | 5432 | PostgreSQL データベース |
| web | 3000 | TanStack Start フロントエンド |
| server | 3001 | Hono API サーバー |
| meilisearch | 7700 | 検索エンジン |

## 基本的な使い方

### サービス起動

```bash
# 全サービス起動（バックグラウンド）
task up

# 全サービス起動（TUI付き）
task services:dev

# サービス停止
task down
```

### スクリプト実行

```bash
# 開発サーバー起動
task dev

# 個別アプリ起動
pnpm dev:web      # Webアプリのみ
pnpm dev:server   # APIサーバーのみ

# ビルド
task build

# Lint/フォーマット
task check

# 型チェック
task check-types
```

### 任意のコマンド実行

Taskfileに定義されていないコマンドを実行する場合:

```bash
pnpm install --frozen-lockfile
pnpm add <package>
pnpm dlx <command>
```

`devbox run --`や`mise exec --`の付与は不要。コマンドが見つからない場合は、miseのシェル有効化・設定のtrust・`mise install`を確認する。

## データディレクトリ

devbox環境では以下にローカル開発データが保存される：

- `data/meilisearch/` - Meilisearchインデックス
- `.devbox/virtenv/postgresql_18/data/` - PostgreSQLデータ（devboxプラグイン管理）

**重要**: `data/` は `.gitignore` に含まれており、コミット対象外。

## 環境変数

devbox.json でMeilisearch関連のデフォルト値が設定済み。
DB接続は devbox.json の `DATABASE_URL` 環境変数を使用。

| 変数 | デフォルト値 |
|------|-------------|
| `DATABASE_URL` | `postgresql://localhost:5432/thac` |
| `MEILI_URL` | `http://localhost:7700` |
| `CORS_ORIGIN` | `http://localhost:3000` |

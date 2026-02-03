# devbox 開発環境

**重要**: このプロジェクトでは devbox を標準の開発環境として使用する。
すべてのコマンド（bun, npm, npx など）は devbox 経由で実行すること。

## サービス構成

devbox services（process-compose）で以下のサービスが起動する：

| サービス | ポート | 説明 |
|---------|--------|------|
| web | 3000 | TanStack Start フロントエンド |
| server | 3001 | Hono API サーバー |
| meilisearch | 7700 | 検索エンジン |

## 基本的な使い方

### サービス起動

```bash
# 全サービス起動（TUI付き）- 推奨
devbox services up

# バックグラウンド起動
devbox services up -b

# サービス停止
devbox services stop
```

### スクリプト実行

```bash
# 開発サーバー起動
devbox run dev

# 個別アプリ起動
devbox run dev:web      # Webアプリのみ
devbox run dev:server   # APIサーバーのみ

# ビルド
devbox run build

# Lint/フォーマット
devbox run check

# 型チェック
devbox run check-types
```

### 任意のコマンド実行

devbox.json に定義されていないコマンドを実行する場合:

```bash
# devbox run -- <コマンド>
devbox run -- bun install
devbox run -- bun add <package>
devbox run -- bunx <command>
```

## データディレクトリ

devbox環境では `data/` にローカル開発データが保存される：

- `data/local.db` - SQLiteデータベース
- `data/meilisearch/` - Meilisearchインデックス

**重要**: `data/` は `.gitignore` に含まれており、コミット対象外。

## 環境変数

devbox.json でMeilisearch関連のデフォルト値が設定済み。
DB接続は `apps/server/.env` のTurso設定を使用。

| 変数 | デフォルト値 |
|------|-------------|
| `MEILI_URL` | `http://localhost:7700` |
| `CORS_ORIGIN` | `http://localhost:3000` |

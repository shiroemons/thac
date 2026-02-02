# devbox 開発環境

## サービス構成

devbox services（process-compose）で以下のサービスが起動する：

| サービス | ポート | 説明 |
|---------|--------|------|
| web | 3000 | TanStack Start フロントエンド |
| server | 3001 | Hono API サーバー |
| meilisearch | 7700 | 検索エンジン |

## devbox環境での操作

### サービス起動

```bash
# 全サービス起動（TUI付き）
devbox services up

# バックグラウンド起動
devbox services up -b

# サービス停止
devbox services stop
```

### スクリプト実行

```bash
devbox run dev          # bun run dev
devbox run build        # ビルド
devbox run check        # Lint/フォーマット
devbox run check-types  # 型チェック
```

## データディレクトリ

devbox環境では `/data/` にローカル開発データが保存される：

- `data/local.db` - SQLiteデータベース
- `data/meilisearch/` - Meilisearchインデックス

**重要**: `/data/` は `.gitignore` に含まれており、コミット対象外。

## 環境変数

devbox.json でMeilisearch関連のデフォルト値が設定済み。
DB接続は `apps/server/.env` のTurso設定を使用。

| 変数 | デフォルト値 |
|------|-------------|
| `MEILI_URL` | `http://localhost:7700` |
| `CORS_ORIGIN` | `http://localhost:3000` |

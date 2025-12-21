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

## データベースコマンド（Docker）

```bash
# スキーマをDBにプッシュ
make db-push

# マイグレーションを生成
make db-generate

# マイグレーションを実行
make db-migrate

# シードデータを投入
make db-seed

# DBセットアップ（push + seed）
make db-setup

# Drizzle Studioを起動
make db-studio
```

## トラブルシューティング

### 症状別コマンド一覧

| 症状 | コマンド | 説明 |
|------|----------|------|
| コンテナが正常に動作しない | `make restart` | コンテナを再起動 |
| node_modulesが壊れた | `make reset-deps` | コンテナ内の依存関係を再インストール |
| イメージ自体がおかしい | `make rebuild` | イメージを再ビルドして起動 |
| 完全にリセットしたい | `make reset` | ボリューム削除→再ビルド→起動 |
| ディスク容量が不足 | `make prune` | 不要なDockerリソースを削除 |
| コンテナを完全削除 | `make clean` | ボリューム・イメージごと削除 |

### 復旧手順

```bash
# 1. まずコンテナ再起動を試す
make restart

# 2. それでもダメならnode_modulesを再インストール
make reset-deps

# 3. まだダメならイメージを再ビルド
make rebuild

# 4. 最終手段：完全リセット
make reset
```

### ディスク容量の確保

```bash
# 不要なDockerリソースを削除
make prune

# より積極的に削除（未使用イメージも含む）
docker system prune -a
```

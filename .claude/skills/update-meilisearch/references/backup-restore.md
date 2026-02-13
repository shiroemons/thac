# バックアップ・リストア手順

## devbox環境のバックアップ

```
Task 4-devbox: devbox環境のバックアップ
- subagent_type: Bash
- prompt: |
    devbox環境のMeilisearchデータをバックアップしてください。

    1. データディレクトリのコピー:
       cp -r data/meilisearch data/meilisearch.bak

    2. Meilisearchが起動中の場合、API経由でDump作成:
       a. ヘルスチェック: curl -s http://localhost:7700/health
       b. Dump作成: curl -X POST -H "Authorization: Bearer development_master_key" http://localhost:7700/dumps
       c. タスク完了確認: curl -H "Authorization: Bearer development_master_key" "http://localhost:7700/tasks?types=dumpCreation&limit=1"
       d. Dumpファイル確認: ls data/meilisearch/dumps/
```

## Docker環境のバックアップ

```
Task 4-docker: Docker環境のバックアップ
- subagent_type: Bash
- prompt: |
    Docker環境のMeilisearchデータをバックアップしてください。

    1. Meilisearch起動確認・起動:
       curl -s http://localhost:7700/health
       起動していない場合: docker compose up -d meilisearch
       ヘルスチェックが通るまで待機（最大60秒）

    2. Dump作成:
       curl -X POST -H "Authorization: Bearer development_master_key" http://localhost:7700/dumps
       タスク完了確認: curl -H "Authorization: Bearer development_master_key" "http://localhost:7700/tasks?types=dumpCreation&limit=1"

    3. Dumpファイルをホストにコピー:
       mkdir -p .meilisearch/dumps
       docker compose cp meilisearch:/meili_data/dumps/<dump_file> .meilisearch/dumps/
```

## Dumpからのリストア

### devbox環境

```bash
# バックアップからデータディレクトリを復元
rm -rf data/meilisearch
mv data/meilisearch.bak data/meilisearch
```

### Docker環境

```bash
# 1. 既存データを削除
docker compose stop meilisearch && docker compose rm -f meilisearch
docker volume rm thac_meilisearch_data
docker volume create thac_meilisearch_data

# 2. Dumpからインポート
docker run --rm \
  -v thac_meilisearch_data:/meili_data \
  -v $(pwd)/.meilisearch/dumps:/dumps:ro \
  -e MEILI_MASTER_KEY=development_master_key \
  getmeili/meilisearch:v<バージョン> \
  meilisearch --import-dump /dumps/<dump_file>

# 3. インポート完了確認後 Ctrl+C で停止
# 4. 通常起動
docker compose up -d meilisearch
```

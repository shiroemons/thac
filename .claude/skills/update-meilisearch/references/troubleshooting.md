# トラブルシューティング・ロールバック

## ロールバック手順

### devbox環境

```
Task: devboxロールバック
- subagent_type: Bash
- prompt: |
    devbox環境のMeilisearchをロールバックしてください。
    1. devbox.lock を元のバージョンに戻す（git checkout devbox.lock）
    2. devbox install
    3. 必要なら data/meilisearch をバックアップから復元:
       rm -rf data/meilisearch
       mv data/meilisearch.bak data/meilisearch
    4. meilisearch --version で確認
```

### Docker環境

```
Task: Dockerロールバック
- subagent_type: Bash
- prompt: |
    Docker環境のMeilisearchをロールバックしてください。
    1. docker compose stop meilisearch
    2. docker-compose.yml を元のバージョンに戻す
    3. スナップショットから復元（必要な場合）
    4. docker compose up -d meilisearch
    5. ヘルスチェック確認: curl -s http://localhost:7700/health
```

## 障害復旧

### 起動失敗（os error 11 - Resource temporarily unavailable）

バージョンアップグレード後にサービスが起動しない場合の対処法:

```
Task: データ復旧
- subagent_type: Bash
- prompt: |
    Meilisearchの起動障害を復旧してください。

    devbox環境:
      1. data/meilisearch を削除して Dump から再構築
      2. data/meilisearch.bak があればそこから復元
      3. task restart

    Docker環境:
      1. docker compose stop meilisearch && docker compose rm -f meilisearch
      2. ボリュームを使用中のコンテナがあれば削除:
         docker ps -a --filter volume=thac_meilisearch_data -q | xargs -r docker rm -f
      3. docker volume rm thac_meilisearch_data
      4. docker volume create thac_meilisearch_data
      5. docker run --rm \
           -v thac_meilisearch_data:/meili_data \
           -v $(pwd)/.meilisearch/dumps:/dumps:ro \
           -e MEILI_MASTER_KEY=development_master_key \
           getmeili/meilisearch:v<現バージョン> \
           meilisearch --import-dump /dumps/meilisearch-dump.dump
      6. インポート完了確認後 Ctrl+C で停止
      7. docker compose up -d meilisearch
      8. ヘルスチェック確認: curl -s http://localhost:7700/health
```

この問題は以下の原因で発生します:
- バージョン間のデータベースフォーマット非互換
- 一時コンテナがボリュームをロックしたまま残存（Docker環境）
- dump経由の移行が正常に完了していない

### Docker ボリューム競合

ボリュームが使用中で削除できない場合:

```bash
# 使用中のコンテナを確認・削除
docker ps -a --filter volume=thac_meilisearch_data -q | xargs -r docker rm -f
# ボリューム削除・再作成
docker volume rm thac_meilisearch_data
docker volume create thac_meilisearch_data
```

### devbox install 失敗

```bash
# キャッシュクリアして再試行
devbox install --refresh
# それでも失敗する場合、devbox.lock を確認
# resolved, version, store_path の整合性をチェック
```

### API認証エラー

```bash
# マスターキーの確認
curl -s -H "Authorization: Bearer development_master_key" http://localhost:7700/health
# 環境変数の確認
echo $MEILI_MASTER_KEY
```

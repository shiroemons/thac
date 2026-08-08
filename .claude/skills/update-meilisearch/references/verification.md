# アップグレード検証手順

## 検証サブエージェント

```
Task 6: 検証
- subagent_type: Bash
- prompt: |
    Meilisearchのアップグレードを検証してください。
    バージョン確認だけでなく、データが正しく移行されているかも必ず確認すること。

    devbox環境:
      1. バージョン確認:
         meilisearch --version

      2. サービス起動中なら以下を全て確認:
         a. ヘルスチェック:
            curl -s http://localhost:7700/health
            → {"status":"available"} を確認

         b. バージョン確認:
            curl -s -H "Authorization: Bearer development_master_key" http://localhost:7700/version
            → 目的のバージョンを確認

         c. インデックス一覧とドキュメント数:
            curl -s -H "Authorization: Bearer development_master_key" http://localhost:7700/indexes
            → インデックスが存在し、ドキュメント数がアップグレード前と同等であることを確認

         d. 検索動作確認（tracks インデックスが存在する場合）:
            curl -s -H "Authorization: Bearer development_master_key" \
              "http://localhost:7700/indexes/tracks/search" \
              -H 'Content-Type: application/json' \
              -d '{"q": "test", "limit": 3}'
            → 検索結果が返ってくることを確認（データが読み取り可能であること）

         e. インデックス設定の確認:
            curl -s -H "Authorization: Bearer development_master_key" \
              http://localhost:7700/indexes/tracks/settings
            → searchableAttributes, filterableAttributes 等が保持されていることを確認

    Docker環境:
      1. docker compose up -d meilisearch
      2. ヘルスチェック待機（最大60秒）
      3. 上記 a〜e と同様の検証を実施
```

## 検証チェックリスト

| 項目 | 確認内容 | 期待値 |
|------|---------|--------|
| バージョン | `meilisearch --version` / API `/version` | 目的のバージョン |
| ヘルスチェック | `/health` | `{"status":"available"}` |
| インデックス数 | `/indexes` のレスポンス数 | アップグレード前と同数 |
| ドキュメント数 | 各インデックスの `numberOfDocuments` | アップグレード前と同等 |
| 検索動作 | `/indexes/tracks/search` | 結果が返ること |
| インデックス設定 | `/indexes/tracks/settings` | 設定が保持されていること |

## 報告フォーマット

```
検証結果:
  - バージョン: OK/NG (実際のバージョン)
  - ヘルスチェック: OK/NG
  - インデックス数: <数> (アップグレード前: <数>)
  - ドキュメント数: <数> (アップグレード前: <数>)
  - 検索動作: OK/NG
  - インデックス設定: OK/NG (保持されている設定一覧)
```

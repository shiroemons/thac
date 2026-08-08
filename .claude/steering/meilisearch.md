# Meilisearch

## 概要

全文検索エンジン Meilisearch の設定ガイド。アーティスト、サークル、楽曲等の検索に使用。

## 開発環境

- **バージョン**: 1.51.0（devbox.json で `meilisearch@1.51.0` 指定、docker-compose.yml も `getmeili/meilisearch:v1.51.0` に揃える）
- **ポート**: 7700
- **Search Preview**: http://localhost:7700
- **起動方法**: `task up`（process-compose経由）
- **データ保存先**: `data/meilisearch/`

## 日本語対応

Meilisearch v1.10.2以降は日本語を**最適化サポート**している。

### 基本設定

```json
{
  "locales": ["jpn"]
}
```

### トークナイザー

- **Lindera** + **UniDic**（形態素解析器）を使用
- IPADICより固有名詞・現代用語の分割精度が高い
- 自動的にひらがな・カタカナ・漢字を処理

### 正規化（自動適用）

| 変換 | 例 |
|-----|-----|
| 半角→全角 | `ｶﾞｷﾞ` → `ガギ` |
| NFKD正規化 | 全角・半角の統一 |

## 既知の問題と対策

### 1. 漢字のみのクエリ

漢字だけだと中国語と誤認識される場合あり。

**対策**: `locales: ["jpn"]` を必ず設定

### 2. 固有名詞の分割

辞書にない単語が正しく分割されない。

**対策**: `dictionary`で独自辞書を登録

```json
{
  "dictionary": ["東方Project", "THAC"]
}
```

### 3. タイポ許容での誤マッチ

日本語は1文字変わると意味が変わる。

**対策**: タイポ許容の閾値を調整

```json
{
  "typoTolerance": {
    "minWordSizeForTypos": {
      "oneTypo": 4,
      "twoTypos": 8
    }
  }
}
```

## 推奨設定例

```json
{
  "locales": ["jpn"],
  "dictionary": ["東方Project", "THAC", "ボーカロイド"],
  "typoTolerance": {
    "minWordSizeForTypos": {
      "oneTypo": 4,
      "twoTypos": 8
    }
  },
  "searchableAttributes": ["name", "nameReading", "description"],
  "filterableAttributes": ["type", "tags"],
  "sortableAttributes": ["createdAt", "name"]
}
```

## 環境変数

| 変数 | 説明 | デフォルト（devbox） |
|-----|------|-----------|
| `MEILI_MASTER_KEY` | API認証キー | `development_master_key` |
| `MEILI_URL` | Meilisearch URL | `http://localhost:7700` |

## コマンド

```bash
# ログ確認
devbox services attach

# devbox環境のシェルへ接続
devbox shell

# ヘルスチェック
curl http://localhost:7700/health
```

## バージョンアップ

### バージョニングポリシー

- **月1〜2回**のリリース（2025年現在、非常に活発）
- 最新版のみサポート（LTSなし）
- Semantic Versioning 2.0.0準拠

### devbox でのアップグレード（推奨）

devbox と Docker Compose は同じ安定版へ固定する。`@latest` は使用せず、リリースノートとデータベース互換性を確認してから明示的に更新する。

```bash
# devbox.json のバージョン固定を変更した後にロックを更新
devbox update

# バージョン確認
meilisearch --version
```

### Docker Compose でのアップグレード手順（本番/CI用）

```bash
# 1. 現在のバージョン確認
curl -s -H "Authorization: Bearer $MEILI_MASTER_KEY" http://localhost:7700/version

# 2. dumpを作成し、taskのsucceededを確認
curl -X POST -H "Authorization: Bearer $MEILI_MASTER_KEY" http://localhost:7700/dumps
curl -H "Authorization: Bearer $MEILI_MASTER_KEY" "http://localhost:7700/tasks?types=dumpCreation"

# 3. コンテナ停止後、外部volumeを非破壊コピー
docker compose stop meilisearch

# 4. docker-compose.yml のイメージタグを更新
# image: getmeili/meilisearch:v1.50.0 → v1.51.0 など

# 5. DB更新が必要な場合、新バージョンを --upgrade-db 付きで一度だけ隔離起動
# upgradeDatabase taskのsucceededを確認して停止する

# 6. 以後は --upgrade-db なしで通常起動
docker compose up -d meilisearch

# 7. health、version、indexes、文書数、settings、代表検索を移行前と照合
curl http://localhost:7700/health
curl -s -H "Authorization: Bearer $MEILI_MASTER_KEY" http://localhost:7700/version
```

### Dumplessアップグレード

対応するバージョン間では dump のimportを介さず、`--upgrade-db` を付けた新バージョンを一度だけ起動して更新できる。新バージョンのバイナリを、旧形式のDBへ `--upgrade-db` なしで起動してはならない。

```bash
# ローカルDBの例（既存プロセス停止・バックアップ検証後に実行）
meilisearch \
  --db-path ./data/meilisearch \
  --http-addr 127.0.0.1:17701 \
  --upgrade-db
```

起動後は `/tasks?types=upgradeDatabase` の最新taskについて、`details.upgradeFrom` と `details.upgradeTo` が意図どおりで、`status: succeeded` かつ `error: null` であることを確認する。失敗時は即座に停止し、自動復元や再実行はせず原因を調査する。

### Dump経由のアップグレード（大きなバージョン差がある場合）

```bash
# 1. ダンプ作成
curl -X POST -H "Authorization: Bearer $MEILI_MASTER_KEY" http://localhost:7700/dumps

# 2. タスク完了を確認
curl -H "Authorization: Bearer $MEILI_MASTER_KEY" "http://localhost:7700/tasks?types=dumpCreation"

# 3. ダンプファイルをコピー（ボリューム内）
docker compose exec meilisearch ls /meili_data/dumps/

# 4. 新バージョンで --import-dump オプション付きで起動
```

### 1.41.0 → 1.51.0 移行記録（2026-08-08 JST）

- local `data/meilisearch`: `upgradeDatabase` task 128 が成功（`upgradeFrom: v1.41.0`、`upgradeTo: v1.51.0`、errorなし）。フラグなし再起動でもhealth available、1 index `tracks`、primary key `id`、4,482文書、indexing停止、代表検索3件を確認した。DBサイズ、最終更新時刻、全settingsは移行前と一致した。
- Docker external volume `thac_meilisearch_data`: 明示した `getmeili/meilisearch:v1.51.0` でtask 1が成功（errorなし）。Composeのフラグなし再起動でもhealth available、version 1.51.0、index 0件、`lastUpdate: null` を確認した。
- local cold backup: `data/meilisearch.pre-1.51.20260807T235015+0900.bak`（移行直前にsourceと全7ファイル一致、tree SHA-256 `4ffee2cea74149847aa0999013a96e520a0f5575374efc3413ad092e08ec276c`）
- local dump: `.meilisearch/dumps/devbox-1.41.0-20260807-145301252.dump`（SHA-256 `0526d35f67fd6091158a47c6fa7fff8088880a77bbb9ce971a263ff933c12804`）
- Docker raw volume backup: `/private/tmp/thac-meilisearch-preupgrade-20260807TmpeK6I/docker-volume-thac_meilisearch_data`（tree SHA-256 `d44f3f1b754589c768ee5c97f84ff30430e8d6cb86f9ee29421114f88a0e1341`）
- Docker dump: `.meilisearch/dumps/docker-volume-1.41.0-20260807-145438954.dump`（SHA-256 `240c948a3b0683029def76833ab8726cac8af77d9e1c5520f695809933f1627c`）

### ベストプラクティス

- アップグレード前にAPI dumpと、停止状態のDB/volume cold copyを作成して検証
- [リリースノート](https://github.com/meilisearch/meilisearch/releases)で破壊的変更を確認
- index数、文書数、primary key、settings、代表検索を移行前後で照合
- 開発環境で事前テスト
- 月1回程度の定期的なバージョン確認を推奨

## 参考資料

- [Meilisearch Language Support](https://www.meilisearch.com/docs/learn/what_is_meilisearch/language)
- [Japanese Support Discussion](https://github.com/orgs/meilisearch/discussions/532)
- [Tokenization Guide](https://www.meilisearch.com/docs/learn/indexing/tokenization)
- [Meilisearch Docker Guide](https://www.meilisearch.com/docs/guides/docker)
- [Meilisearch Releases](https://github.com/meilisearch/meilisearch/releases)

---
_Document standards and patterns, not every configuration option_

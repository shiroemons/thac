# Meilisearch

## 概要

全文検索エンジン Meilisearch の設定ガイド。アーティスト、サークル、楽曲等の検索に使用。

## 開発環境

- **バージョン**: v1.31
- **ポート**: 7700
- **Search Preview**: http://localhost:7700

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

| 変数 | 説明 | デフォルト |
|-----|------|-----------|
| `MEILI_MASTER_KEY` | API認証キー | `development_master_key` |
| `MEILI_URL` | Meilisearch URL | `http://meilisearch:7700` |

## コマンド

```bash
# ログ確認
make logs-meilisearch

# シェル接続
make shell-meilisearch

# ヘルスチェック
curl http://localhost:7700/health
```

## バージョンアップ

### バージョニングポリシー

- **月1〜2回**のリリース（2025年現在、非常に活発）
- 最新版のみサポート（LTSなし）
- Semantic Versioning 2.0.0準拠
- 定期的なバージョン確認を推奨

### Docker Compose でのアップグレード手順

```bash
# 1. 現在のバージョン確認
curl -s -H "Authorization: Bearer $MEILI_MASTER_KEY" http://localhost:7700/version

# 2. スナップショット作成（バックアップ）
curl -X POST -H "Authorization: Bearer $MEILI_MASTER_KEY" http://localhost:7700/snapshots

# 3. コンテナ停止
docker compose stop meilisearch

# 4. docker-compose.yml のイメージタグを更新
# image: getmeili/meilisearch:v1.31 → v1.32 など

# 5. 古いコンテナ削除・新バージョンで起動
docker compose up -d meilisearch

# 6. バージョン確認
curl -s -H "Authorization: Bearer $MEILI_MASTER_KEY" http://localhost:7700/version
```

### Dumplessアップグレード（v1.12+ → v1.13+）

データ移行なしでアップグレード可能。内部で自動的にデータベースを更新。

### Dump経由のアップグレード（大きなバージョン差がある場合）

```bash
# 1. ダンプ作成
curl -X POST -H "Authorization: Bearer $MEILI_MASTER_KEY" http://localhost:7700/dumps

# 2. タスク完了を確認
curl -H "Authorization: Bearer $MEILI_MASTER_KEY" http://localhost:7700/tasks?types=dumpCreation

# 3. ダンプファイルをコピー（ボリューム内）
docker compose exec meilisearch ls /meili_data/dumps/

# 4. 新バージョンで --import-dump オプション付きで起動
```

### ベストプラクティス

- アップグレード前に必ずスナップショット作成
- [リリースノート](https://github.com/meilisearch/meilisearch/releases)で破壊的変更を確認
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

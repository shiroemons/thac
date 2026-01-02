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

## 参考資料

- [Meilisearch Language Support](https://www.meilisearch.com/docs/learn/what_is_meilisearch/language)
- [Japanese Support Discussion](https://github.com/orgs/meilisearch/discussions/532)
- [Tokenization Guide](https://www.meilisearch.com/docs/learn/indexing/tokenization)
- [Meilisearch Docker Guide](https://www.meilisearch.com/docs/guides/docker)

---
_Document standards and patterns, not every configuration option_

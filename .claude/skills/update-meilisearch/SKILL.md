---
name: update-meilisearch
description: "Meilisearchアップデートスキル。devbox（メイン開発環境）とDocker（本番/代替環境）の両方でバージョン確認・バックアップ・アップグレードを行う。「Meilisearchをアップデートして」「最新版を確認して」「/update-meilisearch」などのリクエストで起動。"
---

# Meilisearch Update Skill

Meilisearchのバージョン確認・アップグレードを自動化するスキル。
**すべてのタスクはサブエージェントに委託して実行する。**

## 環境構成

```
┌─────────────────────────────────────────────────┐
│              Meilisearch 管理環境                │
├────────────────────┬────────────────────────────┤
│  devbox（メイン）  │  Docker（本番/代替）       │
│                    │                            │
│  devbox.json       │  docker-compose.yml        │
│  devbox.lock       │  image: getmeili/          │
│  nixpkgs 経由      │    meilisearch:v<ver>      │
│                    │                            │
│  data/meilisearch/ │  Docker volume             │
│  (ローカルデータ)  │  (永続化データ)            │
└────────────────────┴────────────────────────────┘
```

## オーケストレーション方針

このスキルはマネージャーとして動作し、実際の作業はすべてサブエージェントに委託する。
各ステップで Task ツールを使用してサブエージェントを起動し、結果を受け取って次のステップに進む。

## ワークフロー

```
┌──────────────────────────────────────────────────────────────────────┐
│ Step 1: バージョン確認（並列実行）                                   │
│   1-A: 現在のバージョン取得（devbox + Docker）                       │
│   1-B: 最新バージョン取得（GitHub API）                              │
│   → Bash エージェント x2                                            │
├──────────────────────────────────────────────────────────────────────┤
│ Step 2: 更新判定・リリースノート確認                                 │
│   → 同じなら終了、異なればリリースノート取得                         │
│   → Bash エージェント                                               │
├──────────────────────────────────────────────────────────────────────┤
│ Step 3: 破壊的変更の確認                                             │
│   3-1: リリースノートから破壊的変更を確認                            │
│   3-2: 影響のある API 使用箇所をコードベースで検索                   │
│   → Bash エージェント                                               │
├──────────────────────────────────────────────────────────────────────┤
│ Step 4: バックアップ作成                                             │
│   ┌─ devbox環境 ─────────────────┐  ┌─ Docker環境 ──────────────┐   │
│   │ data/meilisearch/ をコピー   │  │ Docker volume バックアップ │   │
│   │ API経由で Dump 作成(起動中)  │  │ API経由で Dump 作成       │   │
│   └──────────────────────────────┘  └───────────────────────────┘   │
│   → Bash エージェント                                               │
├──────────────────────────────────────────────────────────────────────┤
│ Step 5: アップグレード実行                                           │
│   ┌─ devbox環境 ─────────────────┐  ┌─ Docker環境 ──────────────┐   │
│   │ devbox.json / devbox.lock    │  │ docker-compose.yml        │   │
│   │ を更新                       │  │ のイメージタグを更新      │   │
│   │ devbox install で適用        │  │ docker compose up -d      │   │
│   └──────────────────────────────┘  └───────────────────────────┘   │
│   → Bash エージェント + Edit ツール                                 │
├──────────────────────────────────────────────────────────────────────┤
│ Step 6: 検証（バージョン + データ移行確認）                           │
│   → バージョン確認・ヘルスチェック                                   │
│   → インデックス数・ドキュメント数の確認（データ移行検証）           │
│   → 検索動作確認・インデックス設定の保持確認                         │
│   → Bash エージェント                                               │
├──────────────────────────────────────────────────────────────────────┤
│ Step 7: ドキュメント更新                                             │
│   → .claude/steering/meilisearch.md のバージョン記載を更新         │
│   → 直接 Edit ツールを使用                                          │
└──────────────────────────────────────────────────────────────────────┘
```

## サブエージェント委託詳細

### Step 1: バージョン確認

**並列で2つのBashエージェントを起動:**

```
Task 1-A: 現在のバージョン取得
- subagent_type: Bash
- prompt: |
    現在のMeilisearchバージョンを取得してください。

    devbox環境:
      meilisearch --version

    Docker環境:
      grep -o 'getmeili/meilisearch:v[0-9.]*' docker-compose.yml

Task 1-B: 最新バージョン取得
- subagent_type: Bash
- prompt: |
    GitHub APIからMeilisearchの最新バージョンを取得してください。
    curl -s https://api.github.com/repos/meilisearch/meilisearch/releases/latest | jq -r '.tag_name'
```

### Step 2: 更新判定

- 現在のバージョンと最新バージョンを比較
- 同じ場合: "最新版です" と報告して終了
- 異なる場合: リリースノートを確認して続行

```
Task 2: リリースノート確認
- subagent_type: Bash
- prompt: |
    Meilisearchの最新リリースノートを取得してください。
    curl -s https://api.github.com/repos/meilisearch/meilisearch/releases/latest | jq -r '.body' | head -80
```

### Step 3: 破壊的変更の確認

```
Task 3: 破壊的変更の影響調査
- subagent_type: Bash
- prompt: |
    リリースノートの破壊的変更をもとに、コードベースへの影響を調査してください。
    1. リリースノートの "Breaking Changes" セクションを確認
    2. 影響のある API エンドポイントやパラメータをコードベースで検索
       例: grep -r "meilisearch" apps/ packages/ --include="*.ts" --include="*.tsx"
    3. 影響がある場合は修正方針を報告
```

### Step 4: バックアップ作成

devbox環境: `data/meilisearch/` コピー + API経由でDump作成
Docker環境: API経由でDump作成 + ホストにコピー

詳細な手順は [backup-restore.md](references/backup-restore.md) を参照。

### Step 5: アップグレード実行

#### devbox環境のアップグレード

```
                    ┌─────────────────────────┐
                    │ devbox search で確認     │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │ search インデックスに    │
                    │ 目的バージョンがある?    │
                    └───────────┬─────────────┘
                       Yes ┌────┴────┐ No
                           │         │
               ┌───────────▼───┐ ┌───▼─────────────────────┐
               │ devbox update │ │ nixpkgs 手動参照で更新  │
               │ meilisearch   │ │ (回避策フロー)          │
               └───────────┬───┘ └───┬─────────────────────┘
                           │         │
                    ┌──────▼─────────▼────────┐
                    │ devbox install          │
                    │ バージョン確認          │
                    └─────────────────────────┘
```

**通常フロー:**

```
Task 5-devbox-normal: devbox標準アップグレード
- subagent_type: Bash
- prompt: |
    devboxでMeilisearchをアップグレードしてください。
    1. devbox search meilisearch で利用可能なバージョンを確認
    2. 目的バージョンがあれば: devbox update meilisearch
    3. devbox install
    4. meilisearch --version で確認
```

**回避策フロー（devbox search に未反映の場合）:**
詳細は [upgrade-workarounds.md](references/upgrade-workarounds.md) を参照。

#### Docker環境のアップグレード

**直接 Edit ツールを使用:**
```yaml
# Before
image: getmeili/meilisearch:v<旧バージョン>

# After
image: getmeili/meilisearch:v<新バージョン>
```

#### データ移行（Dumpless アップグレード非対応の場合のみ）

**重要: マイナーバージョン間でデータ互換性がない場合のみ実行**

```
Task 5-migration: データ移行（Docker環境）
- subagent_type: Bash
- prompt: |
    Meilisearchのデータを新バージョンに移行してください。
    1. docker compose stop meilisearch && docker compose rm -f meilisearch
    2. docker volume rm thac_meilisearch_data
    3. docker volume create thac_meilisearch_data
    4. docker run --rm \
         -v thac_meilisearch_data:/meili_data \
         -v $(pwd)/.meilisearch/dumps:/dumps:ro \
         -e MEILI_MASTER_KEY=development_master_key \
         getmeili/meilisearch:v<新バージョン> \
         meilisearch --import-dump /dumps/<dump_file>
    5. インポート完了のログを確認後、Ctrl+C で一時コンテナを停止

    ※ --import-dump 付きで起動するとインポート後もMeilisearchが稼働し続けます
    ※ 一時コンテナなので停止してもデータは永続化されています
```

### Step 6: 検証

バージョン確認・ヘルスチェック・データ移行確認を実施する。
詳細な検証手順は [verification.md](references/verification.md) を参照。

### Step 7: ドキュメント更新

**直接 Edit ツールを使用:**
`.claude/steering/meilisearch.md` のバージョン記載を更新

## バージョン互換性

| 移行パターン | 方法 |
|-------------|------|
| v1.12+ → v1.13+（Dumpless対応バージョン間） | Dumplessアップグレード（自動データ移行） |
| マイナーバージョン間で互換性なし | Dump経由の移行が必要 |

**判断基準**: リリースノートの "Breaking Changes" セクションで DB format の変更有無を確認する。

## ロールバック・障害復旧

問題発生時は [troubleshooting.md](references/troubleshooting.md) を参照。

## 環境変数

| 変数 | 説明 | デフォルト |
|-----|------|-----------|
| `MEILI_MASTER_KEY` | API認証キー | `development_master_key` |
| `MEILI_URL` | Meilisearch URL | `http://localhost:7700` |

## 関連ファイル（更新対象）

| ファイル | 環境 | 説明 |
|---------|------|------|
| `devbox.json` | devbox | パッケージ指定 |
| `devbox.lock` | devbox | バージョンロック（nixpkgs コミット参照） |
| `docker-compose.yml` | Docker | イメージバージョン |
| `.claude/steering/meilisearch.md` | 共通 | ドキュメント |
| `data/meilisearch/` | devbox | ローカルデータ（.gitignore対象） |
| `.meilisearch/dumps/` | Docker | Dumpファイル保存先 |

## 参考資料

- [Meilisearch Releases](https://github.com/meilisearch/meilisearch/releases)
- [Meilisearch Update Guide](https://www.meilisearch.com/docs/learn/update_and_migration/updating)
- nixpkgs の Meilisearch パッケージ管理場所: `pkgs/by-name/me/meilisearch/package.nix` in NixOS/nixpkgs

### リファレンス

- [バックアップ・リストア手順](references/backup-restore.md)
- [アップグレード回避策](references/upgrade-workarounds.md)
- [検証手順](references/verification.md)
- [トラブルシューティング・ロールバック](references/troubleshooting.md)

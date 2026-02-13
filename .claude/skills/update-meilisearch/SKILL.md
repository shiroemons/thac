---
name: update-meilisearch
description: "Meilisearchアップデートスキル。devbox（メイン開発環境）とDocker（本番/代替環境）の両方でバージョン確認・バックアップ・アップグレードを行う。"
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

## 実行トリガー

以下のようなリクエストで起動:
- "Meilisearchをアップデートして"
- "Meilisearchの最新版を確認して"
- "/update-meilisearch"

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
│   → .kiro/steering/meilisearch.md のバージョン記載を更新            │
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
      devbox run -- meilisearch --version

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

#### devbox環境

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

#### Docker環境

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
    4. devbox run -- meilisearch --version で確認
```

**回避策フロー（devbox search に未反映の場合）:**

```
Task 5-devbox-workaround: nixpkgs直接参照でアップグレード
- subagent_type: Bash
- prompt: |
    devbox search に目的バージョンがない場合、nixpkgs を直接参照して更新してください。

    1. nixpkgs で該当バージョンの PR を検索:
       gh search prs --repo NixOS/nixpkgs "meilisearch <version>"

    2. マージ済み PR のコミットハッシュを取得:
       gh pr view <PR番号> --repo NixOS/nixpkgs --json mergeCommit

    3. バージョン確認:
       nix eval "github:NixOS/nixpkgs/<commit>#meilisearch.version"

    4. store パス取得:
       nix eval --raw "github:NixOS/nixpkgs/<commit>#meilisearch.outPath"

    5. devbox.lock を手動更新:
       - resolved: "github:NixOS/nixpkgs/<commit>#meilisearch" に変更
       - version: 新バージョンに変更
       - store_path: 取得した store パスに変更

    6. devbox install でインストール

    7. devbox run -- meilisearch --version で確認
```

**参考: nixpkgs のパッケージ管理場所**
- `pkgs/by-name/me/meilisearch/package.nix` in NixOS/nixpkgs

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

### Step 6: 検証（バージョン + データ移行確認）

```
Task 6: 検証
- subagent_type: Bash
- prompt: |
    Meilisearchのアップグレードを検証してください。
    バージョン確認だけでなく、データが正しく移行されているかも必ず確認すること。

    devbox環境:
      1. バージョン確認:
         devbox run -- meilisearch --version

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

    検証結果を以下の形式で報告:
      - バージョン: OK/NG (実際のバージョン)
      - ヘルスチェック: OK/NG
      - インデックス数: <数> (アップグレード前: <数>)
      - ドキュメント数: <数> (アップグレード前: <数>)
      - 検索動作: OK/NG
      - インデックス設定: OK/NG (保持されている設定一覧)
```

### Step 7: ドキュメント更新

**直接 Edit ツールを使用:**
`.kiro/steering/meilisearch.md` のバージョン記載を更新

## バージョン互換性

| 移行パターン | 方法 |
|-------------|------|
| v1.12+ → v1.13+（Dumpless対応バージョン間） | Dumplessアップグレード（自動データ移行） |
| マイナーバージョン間で互換性なし | Dump経由の移行が必要 |

**判断基準**: リリースノートの "Breaking Changes" セクションで DB format の変更有無を確認する。

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
    4. devbox run -- meilisearch --version で確認
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
      3. devbox services restart

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
| `.kiro/steering/meilisearch.md` | 共通 | ドキュメント |
| `data/meilisearch/` | devbox | ローカルデータ（.gitignore対象） |
| `.meilisearch/dumps/` | Docker | Dumpファイル保存先 |

## 参考資料

- [Meilisearch Releases](https://github.com/meilisearch/meilisearch/releases)
- [Meilisearch Update Guide](https://www.meilisearch.com/docs/learn/update_and_migration/updating)
- nixpkgs の Meilisearch パッケージ管理場所: `pkgs/by-name/me/meilisearch/package.nix` in NixOS/nixpkgs

---
name: worktree
description: "Git worktree・ワークツリー管理（git-wt使用）。ワークツリーの作成・一覧・削除・クリーンアップを行う。「ワークツリーで作業したい」「ワークツリーを削除して」「ブランチを切って作業したい」「並列で開発したい」などのリクエストで起動。"
---

# Worktree Management Skill

`git-wt` を使用したworktree管理スキル。
**すべてのタスクはサブエージェントに委託して実行する。**

## 実行トリガー

以下のようなリクエストで起動:
- "ワークツリーで作業したい"
- "ワークツリーを削除して"
- "ブランチを切って作業したい"
- "並列で開発したい"
- "/worktree add <branch-name>"
- "/worktree list"
- "/worktree cleanup"

## サブコマンド

### `/worktree add <branch-name>` - 新規worktree作成

```
┌──────────────────────────────────────────────────────────┐
│ Step 1: ブランチ命名規則の確認                            │
│   → feature/, fix/, refactor/, chore/, docs/ プレフィックス │
├──────────────────────────────────────────────────────────┤
│ Step 2: worktree作成                                     │
│   → Bash エージェント: git wt <branch-name>              │
│   → hookで自動的にpnpm install --frozen-lockfileが実行される                 │
├──────────────────────────────────────────────────────────┤
│ Step 3: ユーザーへの報告                                  │
│   → 作成されたworktreeのパスを表示                        │
│   → 作業開始ガイダンスを表示                              │
└──────────────────────────────────────────────────────────┘
```

**Bashエージェントへの委託:**
```
Task: worktree作成
- subagent_type: Bash
- prompt: |
    git wt <branch-name> を実行してworktreeを作成してください。
    作業ディレクトリ: プロジェクトルート
```

**ユーザーへの報告内容:**
- worktreeパス: `.worktree/<branch-name>/`
- 移動コマンド: `cd .worktree/<branch-name>/`
- devboxサービスはメインworktreeで起動済みであることを案内
- 個別アプリ起動: `devbox run -- pnpm dev:web` 等

### `/worktree list` - worktree一覧表示

```
Task: worktree一覧
- subagent_type: Bash
- prompt: |
    git wt を実行してworktree一覧を表示してください。
    作業ディレクトリ: プロジェクトルート
```

各worktreeのブランチ・パスを整形してユーザーに表示する。

### `/worktree cleanup` - マージ済みworktreeの一括削除

```
┌──────────────────────────────────────────────────────────┐
│ Step 1: devboxサービス停止確認                            │
│   → ユーザーに確認後、devbox services stop               │
├──────────────────────────────────────────────────────────┤
│ Step 2: worktree一覧取得                                 │
│   → Bash エージェント: git wt --json                     │
├──────────────────────────────────────────────────────────┤
│ Step 3: .worktree/ 配下のworktreeを特定                  │
│   → マージ済みか確認                                     │
├──────────────────────────────────────────────────────────┤
│ Step 4: マージ済みworktreeを削除                          │
│   → Bash エージェント: git wt -D <target>                │
│   → 未マージはスキップ（ユーザーに報告）                  │
├──────────────────────────────────────────────────────────┤
│ Step 5: リモート参照のクリーンアップ                      │
│   → Bash エージェント: git fetch --prune                 │
├──────────────────────────────────────────────────────────┤
│ Step 6: サマリ表示                                       │
│   → 削除したworktree・スキップしたworktreeを一覧表示     │
│   → devboxサービス再起動の要否を確認                      │
└──────────────────────────────────────────────────────────┘
```

**Bashエージェントへの委託:**
```
Task 1: devboxサービス停止
- subagent_type: Bash
- prompt: devbox services stop を実行してください。

Task 2: worktree一覧取得
- subagent_type: Bash
- prompt: git wt --json を実行してworktree一覧をJSON形式で取得してください。

Task 3: マージ済みworktree削除（各worktreeに対して）
- subagent_type: Bash
- prompt: |
    以下を実行してください:
    1. GitHub上でPRがマージ済みか確認（gh pr list --state merged）
    2. マージ済みなら git wt -D <target> で強制削除
    3. 結果を報告
    ※ スカッシュマージのため git branch --merged では検出不可、GitHub側で確認すること

Task 4: リモート参照クリーンアップ
- subagent_type: Bash
- prompt: git fetch --prune を実行してください。
```

## 注意事項

- devbox services（PostgreSQL, Meilisearch等）はメインworktreeのみで起動
- 同一ブランチは1つのworktreeでのみcheckout可能
- 削除は `git wt -D`（強制削除）を使用（スカッシュマージのため `-d` ではブランチ削除が失敗する）
- 手動 `rm -rf` 禁止
- worktree内の `.git` はファイル参照（ディレクトリではない）

## 関連ファイル

- `.claude/rules/branching.md` - ブランチ戦略と運用ルール
- `.claude/rules/workflow.md` - ワークフロー全般
- `.gitignore` - `.worktree/` が除外設定済み

# ブランチ戦略と git-wt 運用ルール

## ブランチ命名規則

| プレフィックス | 用途 |
|--------------|------|
| `feature/<name>` | 新機能 |
| `fix/<name>` | バグ修正 |
| `refactor/<name>` | リファクタリング |
| `chore/<name>` | 設定・ビルド関連 |
| `docs/<name>` | ドキュメント |

## 作業開始時のルール（計画 → 実行フロー）

**実装・修正を行う前に、必ず worktree を作成してから作業を開始すること。**
main上で直接作業したり、`git checkout -b` でブランチを切ったりしてはいけない。

### 基本フロー（推奨）

worktree を先に作成し、その中で実装を行う。
`git wt` は**作成と同時にworktreeディレクトリへ移動する**。

```
Step 0: git wt <branch-name> でworktree作成 + 自動移動
        → 以降の全作業はこのディレクトリ内で実行
Step 1〜: 実装タスク
```

計画（Plan mode）で実装タスクを立てる際も、**Step 0 として worktree の作成を必ず含める**こと。

理由: コンテキストクリア後に計画を実行すると main ブランチに戻るため、
実行フェーズの最初に worktree を作成し、同じセッション内で作業を続ける必要がある。

- 計画の Step 0 には必ず `git wt <branch-name>` を含める
- worktree内で作業することで、mainブランチをクリーンに保つ
- 同じ Claude Code セッションで worktree 内の作業を完結させる

### 救済フロー（mainに未コミットの変更がある場合のみ）

mainブランチで既に変更を行ってしまった場合の**緊急対応手順**。
基本フローに従い、この状況を作らないことが望ましい。

```bash
# 1. mainの変更をstash（未追跡ファイルも含む）
git stash --include-untracked

# 2. worktreeを作成（自動で移動される）
git wt <branch-name>

# 3. stashを適用
git stash pop

# 4. 以降はworktree内で作業
```

## Claude Code での注意事項

- `git wt <branch-name>` による新規作成時は**自動でworktreeに移動**する
- **既存のworktreeに移動する場合は `cd .worktree/<branch-name>/` が必要**
- サブエージェント内の `cd` はメインセッションに反映されないため、Bash ツールで直接 `cd` を実行する
- worktree内のパスは `.worktree/<branch-name>/` 配下になる

## git-wt の基本操作

| 操作 | コマンド |
|------|---------|
| worktree作成 | `git wt feature/xxx` |
| worktree一覧 | `git wt` |
| worktree削除 | `git wt -d <target>` |
| 強制削除 | `git wt -D <target>` |

## git-wt のリポジトリ設定（初回セットアップ済み）

```bash
git config wt.basedir ".worktree"       # 配置場所
git config wt.copyignored true          # .env等をコピー
git config --add wt.hook "pnpm install --frozen-lockfile"  # 依存関係を自動インストール
git config --add wt.nocopy "node_modules"  # 依存関係はworktreeごとに再インストール
git config --add wt.nocopy ".turbo/"       # キャッシュはworktree毎に再生成
git config --add wt.nocopy "dist/"         # ビルド成果物は再生成
git config --add wt.nocopy ".devbox/"      # devbox環境は共有
git config --add wt.nocopy "data/"         # ローカルデータは共有
```

## worktreeでの開発手順

1. メインworktreeで `task up`（全サービス起動）
2. メインworktreeで `task services:stop-app`（web+serverのみ停止、DB/Meilisearchは維持）
3. worktreeに移動: `cd .worktree/<branch-name>/`
4. `task worktree:dev`（web+serverをworktreeのコードで起動）
5. 作業完了後 Ctrl+C で停止
6. メインに戻って `task restart` または `task up` で復帰

## PR作成後のフロー

- PR作成後は**マージされるまでworktree内で待機**する（追加修正に備える）
- マージ後に main に戻り、クリーンアップを行う

```
PR作成 → worktree内で待機（レビュー対応・追加修正）
       → マージ確認
       → cd <main-repo-path>
       → クリーンアップ
```

## マージ後のクリーンアップ

main に戻ってから以下を実行する:

1. `git pull` で main を最新化
2. `git wt -D <branch-name>` でworktreeとブランチを強制削除
3. `git fetch --prune` でリモートの不要参照を削除

**注意**: このリポジトリはスカッシュマージを使用しているため、`git wt -d`（安全削除）ではブランチ削除が
「not fully merged」エラーで失敗する。マージ済みを確認した上で `git wt -D`（強制削除）を使用すること。

## 注意事項

- 同一ブランチは1つのworktreeでのみcheckout可能
- worktreeの削除は `git wt -D` を使用（手動 `rm -rf` 禁止）
- worktree内の `.git` はファイル参照（ディレクトリではない）

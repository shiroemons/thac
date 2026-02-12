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

計画（Plan mode）で実装タスクを立てる際は、**Step 0 として worktree の作成を必ず含める**こと。

理由: コンテキストクリア後に計画を実行すると main ブランチに戻るため、
実行フェーズの最初に worktree を作成し、同じセッション内で worktree に `cd` して作業を続ける必要がある。

```
Step 0: git wt <branch-name> でworktree作成
        → cd .worktree/<branch-name>/ で移動
        → 以降の全作業はこのディレクトリ内で実行
Step 1〜: 実装タスク
```

- 計画の Step 0 には必ず `git wt <branch-name>` と `cd .worktree/<branch-name>/` を含める
- worktree内で作業することで、mainブランチをクリーンに保つ
- 同じ Claude Code セッションで worktree 内の作業を完結させる

## mainに未コミットの変更がある場合

mainブランチで既に変更を行った後にworktreeを作成する場合は、**stashフロー**を使用する。

```bash
# 1. mainの変更をstash（未追跡ファイルも含む）
git stash --include-untracked

# 2. worktreeを作成
git wt <branch-name>

# 3. worktreeに移動
cd .worktree/<branch-name>/

# 4. stashを適用
git stash pop

# 5. 以降はworktree内で作業
```

**重要**: `git checkout -b` でブランチを切るのではなく、必ず `git wt` を使用すること。

## Claude Code での注意事項

- `git wt` 実行後、**必ず `cd` でworktreeディレクトリに移動**すること
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
git config --add wt.hook "devbox run -- bun install"  # 依存関係を自動インストール
```

## devboxサービスの共有

- devbox services（PostgreSQL, Meilisearch等）はメインworktreeのみで起動
- 他のworktreeは同じDB・サービスを共有利用
- worktree内では `devbox run -- bun run dev:web` 等で個別アプリのみ起動

## マージ後のクリーンアップ

1. `git wt -d <branch-name>` でworktreeとブランチを削除
2. `git fetch --prune` でリモートの不要参照を削除

## 注意事項

- 同一ブランチは1つのworktreeでのみcheckout可能
- worktreeの削除は必ず `git wt -d` を使用（手動 `rm -rf` 禁止）
- worktree内の `.git` はファイル参照（ディレクトリではない）

# ワークフロー

**重要**: 定型操作はTask経由で実行すること。miseがDevbox環境を自動読込するため、一時的なコマンドは直接実行する。

## ブランチとワークツリー

実装・修正の計画を立てる際は、**Step 0 として worktree の作成**を必ず含めること。
コンテキストクリア後に計画を実行する場合、mainブランチに戻るため、
実行フェーズの最初に `git wt` で worktree を作成し `cd` で移動してから作業を開始する。
`git-wt` を使用してワークツリーで作業する。詳細は `branching.md` を参照。

## 実装後・コミット前（必須）

コードを変更したら、コミット前に必ず以下を実行:

```bash
# 型チェック
task check-types

# Lint・フォーマット
task check
```

**重要**: 型チェックは全パッケージ（packages/*, apps/*）に対して実行される。
エラーがある場合は修正してからコミットすること。

## UI変更時のdaisyUI v5準拠チェック（必須）

`apps/web/` のUIコンポーネント（TSX/CSS）を変更した場合、コミット前にdaisyUI v5の非推奨パターンが含まれていないことを確認する。
詳細は `daisyui-v5.md` を参照。不明な点は context7 MCP で daisyUI の公式ドキュメントを確認すること。

チェック対象:
- `active` → `menu-active`（メニュー内）
- `rounded-btn` → `rounded-field`
- `stats` に `bg-base-100` が指定されているか
- `hover` → `hover:bg-base-300`（テーブル行）
- `input`/`select` に `w-full` が明示されているか
- `z-[1]` → `z-1`

## コミット

コンベンショナルコミット形式を使用（メッセージは日本語）:

```
feat: 新機能を追加
fix: バグを修正
docs: ドキュメントを更新
refactor: コードをリファクタリング
test: テストを追加・修正
chore: ビルド・設定などの雑務
```

例: `feat: ユーザー認証機能を追加`

## コミット後の確認（必須）

pre-commitフックがフォーマット修正を行う場合があるため、コミット後に必ず確認:

```bash
git status
```

未コミットの変更がある場合は、直前のコミットに含める:

```bash
git add -- path/to/changed-file
git diff --cached
git commit --amend --no-edit
```

`git add -A`と`git add .`は禁止。対象ファイルを必ず明示する。`git add -p`も原則使用せず、同一ファイル内の差分を分ける必要がある場合はユーザーへ確認する。

**注意**: PR作成前に必ず `git status` で未コミットの変更がないことを確認すること。

## PR作成（必須）

gh pr create 時は必ずテンプレートを使用:

```bash
gh pr create --body-file .github/pull_request_template.md
```

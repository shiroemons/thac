# ワークフロー

## 実装後・コミット前（必須）

コードを変更したら、コミット前に必ず以下を実行:

```bash
# Docker経由（推奨）
make check-types  # 全パッケージの型チェック
make check        # Lint・フォーマット

# または ローカル実行
bun run check-types
bun run check
```

**重要**: 型チェックは全パッケージ（packages/*, apps/*）に対して実行される。
エラーがある場合は修正してからコミットすること。

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
git add -A && git commit --amend --no-edit
```

**注意**: PR作成前に必ず `git status` で未コミットの変更がないことを確認すること。

## PR作成（必須）

gh pr create 時は必ずテンプレートを使用:

```bash
gh pr create --body-file .github/pull_request_template.md
```

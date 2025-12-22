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

## PR作成（必須）

gh pr create 時は必ずテンプレートを使用:

```bash
gh pr create --body-file .github/pull_request_template.md
```

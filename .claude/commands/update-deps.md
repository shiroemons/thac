---
description: ライブラリアップデートスキル。依存関係を安全にアップデートし、個別コミット後にPRを作成する。
allowed-tools: Bash, Read, WebFetch, Glob, Grep, TodoWrite, AskUserQuestion, Skill
argument-hint: [package-name]
---

引数: $ARGUMENTS

ライブラリの依存関係を安全にアップデートし、PRを作成する。

## 処理フロー

```
┌─────────────────────────────────────────────────────────────┐
│ /update-deps [@tanstack/react-router]                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 0. 専用ブランチの作成                                        │
│    - feat/update-deps-YYYYMMDD ブランチを作成               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. アップデート対象の特定                                    │
│    - bunx npm-check-updates --workspaces で全体を確認       │
│    - 関連パッケージをグループ化（@tanstack/* 等）           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ユーザーに確認                                            │
│    - outdated パッケージ一覧を表示                          │
│    - 全て/マイナーのみ/キャンセル を選択                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 各パッケージ（グループ）ごとにループ処理                  │
│    a. CHANGELOG/Release Notes を取得 (メジャー変更時)       │
│    b. package.json を直接編集してバージョン更新             │
│    c. bun install で依存関係を解決                          │
│    d. 検証: 型チェック → テスト → Lint → ビルド            │
│    e. 問題なければコミット（lockfile含む）                  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. PR作成 (/pr スキルを呼び出し)                             │
└─────────────────────────────────────────────────────────────┘
```

## 手順

### 0. 専用ブランチの作成

main ブランチで直接作業せず、専用ブランチを作成:

```bash
git checkout -b feat/update-deps-$(date +%Y%m%d)
```

### 1. アップデート対象の特定

以下のコマンドで outdated パッケージを確認:

```bash
bunx npm-check-updates --workspaces
```

このコマンドは以下をすべてチェックする:
- ルート package.json の dependencies/devDependencies
- ルート package.json の workspaces.catalog
- apps/* の各 package.json
- packages/* の各 package.json

#### 関連パッケージのグループ化

以下のパッケージは関連性が高いため、一括でアップデートする:
- `@tanstack/*` （react-router, react-query, react-form 等）
- `@testing-library/*`
- `@typescript-eslint/*`
- `@babel/*`
- `drizzle-orm` と `drizzle-kit`

引数が指定されている場合:
- 指定パッケージ名でフィルタリングして処理

### 2. ユーザーへの確認

outdated パッケージを表形式で表示:

| カテゴリ | パッケージ | 現在 | 最新 | 変更種別 |
|----------|------------|------|------|----------|
| catalog | pkg-name | 1.0.0 | 2.0.0 | major |
| apps/web | pkg-name | 1.0.0 | 1.1.0 | minor |

AskUserQuestion で以下を確認:
- 全てアップデート
- マイナー/パッチのみ（メジャー変更を除外）
- キャンセル

### 3. パッケージごとの処理

#### a. CHANGELOG/Release Notes の取得（メジャー変更時のみ）
- GitHub Releases を WebFetch で取得
- 破壊的変更がある場合はユーザーに報告
- URL例:
  - `https://github.com/{owner}/{repo}/releases`
  - `https://github.com/{owner}/{repo}/blob/main/CHANGELOG.md`

#### b. バージョン更新

**Catalog のパッケージの場合:**
ルート package.json の `workspaces.catalog` を直接編集:
```json
{
  "workspaces": {
    "catalog": {
      "package-name": "新バージョン"
    }
  }
}
```

**通常のパッケージの場合:**
対象の package.json の dependencies/devDependencies を直接編集

#### c. 依存関係の解決
```bash
bun install
```

#### d. 検証（全て成功するまで次に進まない）

```bash
# 1. 型チェック
bun run check-types

# 2. テスト実行
bun run test

# 3. Lint・フォーマット
bun run check

# 4. ビルド検証
bun run build
```

エラーが発生した場合:
- エラー内容をユーザーに報告
- 修正が必要な箇所を特定
- AskUserQuestion で続行方法を確認（スキップ/修正/中断）

#### e. コミット

検証が成功した場合、**lockfile (bun.lockb) を含めて**コミット:

```bash
git add package.json bun.lockb [変更されたpackage.json]
git commit -m "fix(deps): update <package-name> to v<version>"
```

グループ化されたパッケージの場合:
```
fix(deps): update @tanstack/* packages
```

### 4. PR作成

全パッケージの処理完了後:
- `/pr` スキルを呼び出してPRを作成

## 注意事項

- **専用ブランチで作業** - main で直接作業しない
- **各パッケージは個別にコミット** - 1パッケージ（またはグループ）= 1コミット
- **関連パッケージは一括更新** - @tanstack/* 等はまとめて更新
- **メジャーバージョン変更時は必ず CHANGELOG を確認**
- **検証は全て通す** - 型チェック、テスト、Lint、ビルドの全てが成功すること
- **lockfile を必ずコミットに含める** - bun.lockb を忘れない
- **検証失敗時はスキップするか修正するか選択させる**
- **catalog を使用しているパッケージは catalog 側を更新する**

## ロールバック

問題が発生した場合の復旧手順:

```bash
# 特定のコミットを取り消す
git revert <commit-hash>

# または、ブランチごと破棄
git checkout main
git branch -D feat/update-deps-YYYYMMDD
```

## TodoWrite の活用

処理開始時に TodoWrite でタスクを管理:
1. 専用ブランチの作成
2. アップデート対象パッケージの特定
3. 各パッケージのアップデート（パッケージ/グループ数分のサブタスク）
4. PR作成

進捗を随時更新し、ユーザーが状況を把握できるようにする。

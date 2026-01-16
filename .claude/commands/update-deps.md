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
│ 1. アップデート対象の特定                                    │
│    - bunx npm-check-updates --workspaces で全体を確認       │
│    - catalog, apps/*, packages/* を網羅的にチェック         │
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
│ 3. 各パッケージごとにループ処理                              │
│    a. CHANGELOG/Release Notes を取得 (メジャー変更時)       │
│    b. package.json を直接編集してバージョン更新             │
│    c. bun install で依存関係を解決                          │
│    d. 型チェック実行 (bun run check-types)                   │
│    e. Lint実行 (bun run check)                               │
│    f. 問題なければコミット                                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. PR作成 (/pr スキルを呼び出し)                             │
└─────────────────────────────────────────────────────────────┘
```

## 手順

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

#### d. 検証
```bash
# 型チェック
bun run check-types

# Lint・フォーマット
bun run check
```

エラーが発生した場合:
- エラー内容をユーザーに報告
- 修正が必要な箇所を特定
- AskUserQuestion で続行方法を確認（スキップ/修正/中断）

#### e. コミット
検証が成功した場合:
```
fix(deps): update <package-name> to v<version>
```

### 4. PR作成

全パッケージの処理完了後:
- `/pr` スキルを呼び出してPRを作成

## 注意事項

- 各パッケージは個別にコミットする（1パッケージ = 1コミット）
- メジャーバージョン変更時は必ず CHANGELOG を確認
- 検証失敗時はスキップするか修正するか選択させる
- catalog を使用しているパッケージは catalog 側を更新する

## TodoWrite の活用

処理開始時に TodoWrite でタスクを管理:
1. アップデート対象パッケージの特定
2. 各パッケージのアップデート（パッケージ数分のサブタスク）
3. PR作成

進捗を随時更新し、ユーザーが状況を把握できるようにする。

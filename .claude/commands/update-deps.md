---
description: ライブラリアップデートスキル。依存関係を安全にアップデートし、個別コミット後にPRを作成する。
allowed-tools: Bash, Read, WebFetch, Glob, Grep, TodoWrite, AskUserQuestion, Skill, Task
argument-hint: [package-name]
---

引数: $ARGUMENTS

ライブラリの依存関係を安全にアップデートし、PRを作成する。

## オーケストレーターの役割

**重要**: あなたはオーケストレーターとして動作する。直接実装を行わず、Task subagent に委託すること。

### オーケストレーターが担当すること
- ブランチ作成の指示（Phase 0）
- outdated パッケージ特定の指示（Phase 1）
- ユーザー確認（AskUserQuestion）
- Task subagent の起動と結果収集
- エラー集約とユーザーへの報告
- /pr スキルの呼び出し（Phase 4）

### オーケストレーターが担当しないこと（Task subagent に委託）
- CHANGELOG/Release Notes の取得（Phase 2 - 並列実行）
- 各パッケージの更新・インストール・検証・コミット（Phase 3 - 直列実行）

## 処理フロー（ハイブリッド並列-直列パターン）

```
┌─────────────────────────────────────────────────────────────────┐
│ /update-deps [@tanstack/react-router]                           │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 0-1: Sequential (Orchestrator)                            │
│   - ブランチ作成                                                 │
│   - outdated パッケージ特定                                      │
│   - ユーザー確認                                                 │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 2: Parallel (Task subagents)                              │
│   - CHANGELOG/Release Notes 取得（安全に並列化可能）            │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐                          │
│   │ Task A  │ │ Task B  │ │ Task C  │  ...                     │
│   │CHANGELOG│ │CHANGELOG│ │CHANGELOG│                          │
│   └─────────┘ └─────────┘ └─────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 3: Sequential (Task subagents, one at a time)             │
│   - 各パッケージグループの更新・検証・コミット                   │
│   - Git競合回避のため直列実行                                    │
│                                                                  │
│   Task 1: @tanstack/* → Update → Install → Verify → Commit     │
│                              ↓                                   │
│   Task 2: drizzle-*  → Update → Install → Verify → Commit      │
│                              ↓                                   │
│   Task 3: zod        → Update → Install → Verify → Commit      │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 4: Sequential (Orchestrator)                              │
│   - 結果集約・エラー処理                                         │
│   - /pr スキル呼び出し                                           │
└─────────────────────────────────────────────────────────────────┘
```

## 手順

### Phase 0. 専用ブランチの作成（Orchestrator）

main ブランチで直接作業せず、専用ブランチを作成:

```bash
git checkout -b feat/update-deps-$(date +%Y%m%d)
```

### Phase 1. アップデート対象の特定（Orchestrator）

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

#### ユーザーへの確認

outdated パッケージを表形式で表示:

| カテゴリ | パッケージ | 現在 | 最新 | 変更種別 |
|----------|------------|------|------|----------|
| catalog | pkg-name | 1.0.0 | 2.0.0 | major |
| apps/web | pkg-name | 1.0.0 | 1.1.0 | minor |

AskUserQuestion で以下を確認:
- 全てアップデート
- マイナー/パッチのみ（メジャー変更を除外）
- キャンセル

### Phase 2. CHANGELOG 取得（Task subagents - 並列実行）

メジャーバージョン変更があるパッケージについて、**複数の Task subagent を並列で起動**して CHANGELOG を取得する。

#### Task Prompt Template（CHANGELOG 取得用）

```
パッケージ「{package_name}」のバージョン {current_version} から {target_version} への変更内容を調査してください。

## 調査手順
1. 以下の URL から Release Notes または CHANGELOG を取得:
   - GitHub Releases: https://github.com/{owner}/{repo}/releases
   - CHANGELOG.md: https://github.com/{owner}/{repo}/blob/main/CHANGELOG.md

2. 以下の情報を抽出:
   - 破壊的変更（Breaking Changes）
   - 主要な新機能
   - 非推奨になった機能
   - マイグレーション手順（ある場合）

## 出力形式
以下の形式で結果を返してください:

### {package_name} v{current_version} → v{target_version}

**破壊的変更:**
- (変更内容、なければ「なし」)

**主要な変更:**
- (変更内容の箇条書き)

**マイグレーション必要:** はい/いいえ
**マイグレーション手順:** (ある場合のみ)
```

#### 並列起動の例

```
# 単一メッセージ内で複数の Task tool を呼び出す
Task(subagent_type="general-purpose", description="changelog @tanstack/router", prompt="...")
Task(subagent_type="general-purpose", description="changelog drizzle-orm", prompt="...")
Task(subagent_type="general-purpose", description="changelog zod", prompt="...")
```

### Phase 3. パッケージ更新（Task subagents - 直列実行）

**Git 競合と bun.lockb 競合を回避するため、各パッケージグループは1つずつ順番に処理する。**

#### Task Prompt Template（パッケージ更新用）

```
パッケージ「{package_name_or_group}」を v{target_version} にアップデートしてください。

## 更新対象
- パッケージ: {package_list}
- 現在のバージョン: {current_versions}
- 目標バージョン: {target_versions}
- 更新場所: {catalog または package.json のパス}

## 処理手順

### 1. バージョン更新
{catalog の場合}
ルート package.json の `workspaces.catalog` を編集:
```json
"catalog": {
  "{package_name}": "{target_version}"
}
```

{通常の場合}
対象の package.json の dependencies/devDependencies を編集

### 2. 依存関係のインストール
```bash
bun install
```

### 3. 検証（全て成功すること）
```bash
bun run check-types  # 型チェック
bun run test         # テスト実行（存在する場合）
bun run check        # Lint・フォーマット
bun run build        # ビルド検証
```

### 4. コミット
```bash
git add package.json bun.lockb [変更されたpackage.json]
git commit -m "fix(deps): update {package_name_or_group} to v{target_version}"
```

グループの場合: `fix(deps): update @tanstack/* packages`

## 結果報告

以下の形式で結果を報告してください:

**ステータス:** SUCCESS / FAILED
**パッケージ:** {package_name_or_group}
**バージョン:** {current_version} → {target_version}
**検証結果:**
- 型チェック: PASS/FAIL
- テスト: PASS/FAIL/SKIP
- Lint: PASS/FAIL
- ビルド: PASS/FAIL
**コミットハッシュ:** {hash} (成功時のみ)
**エラー詳細:** (失敗時のみ)
```

#### 直列実行の実装

```
# 1つ目のパッケージを更新
result1 = Task(subagent_type="general-purpose", description="update @tanstack/*", prompt="...")

# result1 の結果を確認してから次へ
if result1.status == "FAILED":
    # ユーザーに確認: スキップ/再試行/中断

# 2つ目のパッケージを更新
result2 = Task(subagent_type="general-purpose", description="update drizzle-*", prompt="...")

# 以下同様...
```

### Phase 4. 結果集約と PR 作成（Orchestrator）

#### 結果集約レポート

全パッケージの処理完了後、以下の形式で結果を表示:

```
## アップデート結果サマリー

| パッケージ | バージョン | ステータス |
|------------|------------|------------|
| @tanstack/* | 1.0.0 → 2.0.0 | ✅ SUCCESS |
| drizzle-* | 0.30.0 → 0.31.0 | ✅ SUCCESS |
| zod | 3.22.0 → 3.23.0 | ❌ FAILED |

### 失敗したパッケージ
- **zod**: 型エラー (src/utils/validation.ts:15)
```

#### エラーハンドリング

検証失敗時は AskUserQuestion で以下を確認:
- **スキップ**: このパッケージをスキップして次へ進む
- **再試行**: 手動修正後に再度検証を実行
- **中断**: 処理を中断（既にコミット済みの変更は保持）

#### PR 作成

成功したパッケージが1つ以上ある場合:
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
- **CHANGELOG 取得は並列実行可能だが、パッケージ更新は直列実行必須**

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
3. ユーザー確認
4. CHANGELOG 取得（並列 Task）
5. 各パッケージのアップデート（直列 Task、パッケージ/グループ数分のサブタスク）
6. 結果集約
7. PR作成

進捗を随時更新し、ユーザーが状況を把握できるようにする。

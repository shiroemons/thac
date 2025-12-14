# Research & Design Decisions

## Summary
- **Feature**: `ci-test-lint`
- **Discovery Scope**: Extension（既存モノレポ構成にCI/CDワークフローを追加）
- **Key Findings**:
  - Vitestは Bunとの互換性問題があり、ハングする（bun testに変更）
  - GitHub Actions workflowは新規作成（.github/workflows/ci.yml）
  - turbo.jsonにtestタスクを追加

## Research Log

### Bun GitHub Actions セットアップ
- **Context**: CIでBunランタイムを使用するための公式アクション調査
- **Sources Consulted**:
  - [oven-sh/setup-bun](https://github.com/oven-sh/setup-bun)
  - [Bun CI/CD Guide](https://bun.com/docs/guides/runtime/cicd)
- **Findings**:
  - `oven-sh/setup-bun@v2`が公式・検証済みアクション
  - `bun-version: latest`または`bun-version-file: ".bun-version"`でバージョン指定可能
  - packageManagerフィールド（`bun@1.2.15`）から自動検出可能
- **Implications**: setup-bun@v2を使用し、package.jsonのpackageManagerから自動バージョン検出を活用

### GitHub Actions 最新バージョン
- **Context**: GitHub Actionsの最新バージョン確認
- **Sources Consulted**:
  - [actions/checkout releases](https://github.com/actions/checkout/releases)
  - [actions/cache releases](https://github.com/actions/cache/releases)
- **Findings**:
  - `actions/checkout@v6`が最新（2025年11月リリース）
  - `actions/cache@v5`が最新（Node.js 24対応）
- **Implications**: 最新バージョンを使用してセキュリティと機能を最新化

### Turborepo GitHub Actions キャッシュ
- **Context**: モノレポのビルドキャッシュ戦略
- **Sources Consulted**:
  - [Turborepo GitHub Actions Guide](https://turborepo.com/docs/guides/ci-vendors/github-actions)
- **Findings**:
  - `actions/cache@v5`で`.turbo`ディレクトリをキャッシュ
  - キャッシュキー: `${{ runner.os }}-bun-${{ hashFiles('**/bun.lock') }}`
  - リストアキー: `${{ runner.os }}-bun-`
- **Implications**: actions/cache@v5で.turboディレクトリをキャッシュし、Turborepoのローカルキャッシュを活用

### Vitest + Bun 互換性問題（重要）
- **Context**: Vitestがローカルでハング（無応答）する問題の調査
- **Sources Consulted**:
  - [oven-sh/bun#9170 - bunx vitest hangs](https://github.com/oven-sh/bun/issues/9170)
  - [vitest-dev/vitest#7402 - Turborepo + Bun + Vitest](https://github.com/vitest-dev/vitest/issues/7402)
  - [Zenn記事 - VitestからBun testへの移行](https://zenn.dev/studio/articles/c5207260e90e8c)
- **Findings**:
  - **根本原因**: VitestはTinypoolを使用しており、`node:child_process`と`node:worker_threads`に依存。BunはこれらのNode.js APIを完全にサポートしていない
  - `vitest run`コマンドが出力なしでハング
  - `pool: "forks"`オプションを設定しても解決しない
  - Bunチームは`bun test`の使用を推奨
- **Implications**: Vitestの代わりにbun test（Bunネイティブテストランナー）を使用

### bun test
- **Context**: Bunネイティブのテストランナー
- **Sources Consulted**:
  - [Bun Test Runner](https://bun.sh/docs/cli/test)
- **Findings**:
  - Bunに組み込まれているため追加依存関係不要
  - `.test.ts`, `.spec.ts`などの命名規則でテストファイルを検出
  - `bun:test`モジュールから`describe`, `test`, `expect`をインポート
  - Jest互換のAPI
  - 非常に高速（Zenn記事では164秒→9秒の改善例）
- **Implications**: bun testを使用し、テストファイルは`bun:test`からインポート

### 既存プロジェクト構成
- **Context**: 現状のテスト・リント環境の把握
- **Sources Consulted**: package.json, turbo.json, biome.json
- **Findings**:
  - apps/webに@testing-library/react, jsdomが既存
  - Biome設定済み（bun run check）
  - TypeScript型チェック設定済み（bun run check-types）
  - turbo.jsonにtestタスク未定義
- **Implications**: bun testを設定し、各ワークスペースにtestスクリプトを追加

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Vitest | 高機能テストフレームワーク | Jest互換、豊富な機能 | Bunとの互換性問題でハング | 採用見送り |
| bun test | Bunネイティブテストランナー | 高速、追加依存なし、Bun完全互換 | 機能はVitestより限定的 | 採用 |

## Design Decisions

### Decision: bun testの採用（Vitestから変更）
- **Context**: テストフレームワークの選定
- **Alternatives Considered**:
  1. Vitest — 高機能だがBunとの互換性問題
  2. bun test — Bunネイティブで高速
- **Selected Approach**: bun test
- **Rationale**:
  - VitestはBunの`node:child_process`/`node:worker_threads`サポート不足によりハング
  - bun testはBunネイティブで完全な互換性
  - 追加依存関係が不要でシンプル
  - 実行速度が大幅に高速
- **Trade-offs**: Vitestの一部高度な機能（カバレッジレポート等）は別途設定が必要
- **Follow-up**: カバレッジが必要になった場合は`bun test --coverage`を検討

### Decision: 単一ワークフローによるCI構成
- **Context**: テスト、Lint、型チェックを効率的にCI上で実行
- **Alternatives Considered**:
  1. 単一ワークフロー — 1つのYAMLで全チェック
  2. 分離ワークフロー — test.yml, lint.yml, type-check.yml
- **Selected Approach**: 単一ワークフロー（ci.yml）
- **Rationale**: 初期実装としてシンプルさを優先、Turborepoのキャッシュで効率化
- **Trade-offs**: ワークフローレベルの部分再実行は不可だが、Turborepoキャッシュで補完
- **Follow-up**: 将来的にワークフロー分離が必要になった場合は拡張可能

## Risks & Mitigations
- **Risk 1**: CI実行時間が長い → Turborepoキャッシュとbun testの高速性で軽減
- **Risk 2**: テストがないワークスペースでtestコマンドが警告 → 問題なし（ワークフローは成功）
- **Risk 3**: Bunバージョン不一致 → package.jsonのpackageManagerで固定

## References
- [oven-sh/setup-bun](https://github.com/oven-sh/setup-bun) — GitHub Actions用Bunセットアップ
- [Turborepo GitHub Actions](https://turborepo.com/docs/guides/ci-vendors/github-actions) — 公式CIガイド
- [Bun Test Runner](https://bun.sh/docs/cli/test) — bun testドキュメント
- [Biome](https://biomejs.dev/) — Lint/フォーマットツール
- [oven-sh/bun#9170](https://github.com/oven-sh/bun/issues/9170) — Vitest ハング問題
- [vitest-dev/vitest#7402](https://github.com/vitest-dev/vitest/issues/7402) — Turborepo + Bun + Vitest問題


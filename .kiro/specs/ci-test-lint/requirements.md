# Requirements Document

## Introduction

本仕様は、thacプロジェクトにおけるモダンなテスト環境の構築と、GitHub ActionsによるCI（継続的インテグレーション）パイプラインの実装を定義する。プロジェクトはTurborepoによるモノレポ構成で、Bun、TypeScript、bun test、Biomeを使用している。CIパイプラインでは、プルリクエストやプッシュ時にテストとLintチェックを自動実行し、コード品質を継続的に担保する。

## Requirements

### Requirement 1: テスト環境の構築

**Objective:** As a 開発者, I want プロジェクト全体でbun testを使用したテストを実行できる環境, so that コードの品質を自動的に検証できる

#### Acceptance Criteria

1. When `bun run test` コマンドを実行した時, the CI System shall 全ワークスペース（apps/web, apps/server, packages/*）のテストを実行する
2. When テストが失敗した時, the CI System shall 失敗したテストの詳細情報（ファイル名、テスト名、エラーメッセージ）を出力する
3. The CI System shall Turborepoのキャッシュ機能を活用してテスト実行を高速化する
4. While テストが実行中の時, the CI System shall 各ワークスペースのテスト進捗状況を表示する

### Requirement 2: GitHub Actions CIワークフロー

**Objective:** As a 開発者, I want プルリクエストとmainブランチへのプッシュ時に自動でテストとLintチェックが実行される, so that コード品質の問題を早期に検出できる

#### Acceptance Criteria

1. When mainブランチにプッシュした時, the GitHub Actions shall テストとLintチェックを自動実行する
2. When プルリクエストを作成または更新した時, the GitHub Actions shall テストとLintチェックを自動実行する
3. The GitHub Actions shall Bunランタイムを使用してワークフローを実行する
4. If テストまたはLintチェックが失敗した時, then the GitHub Actions shall ワークフローを失敗ステータスで終了する
5. When ワークフローが完了した時, the GitHub Actions shall 実行結果（成功/失敗）をプルリクエストに表示する

### Requirement 3: Lintチェックの自動化

**Objective:** As a 開発者, I want Biomeによるコード品質チェックがCI上で自動実行される, so that コーディング規約の違反を検出できる

#### Acceptance Criteria

1. When `bun run check` コマンドを実行した時, the CI System shall Biomeによるlint/フォーマットチェックを実行する
2. When Lintエラーが検出された時, the CI System shall エラー箇所（ファイル名、行番号、ルール名）を出力する
3. The CI System shall プロジェクトの既存のBiome設定（biome.json）を使用する

### Requirement 4: 型チェックの自動化

**Objective:** As a 開発者, I want TypeScriptの型チェックがCI上で自動実行される, so that 型安全性の問題を検出できる

#### Acceptance Criteria

1. When `bun run check-types` コマンドを実行した時, the CI System shall 全ワークスペースのTypeScript型チェックを実行する
2. If 型エラーが検出された時, then the CI System shall エラー箇所（ファイル名、行番号、エラーメッセージ）を出力する
3. The CI System shall TypeScript strict modeの設定を維持する

### Requirement 5: CIパフォーマンスの最適化

**Objective:** As a 開発者, I want CIの実行時間が最適化されている, so that フィードバックを素早く得られる

#### Acceptance Criteria

1. The GitHub Actions shall 依存関係（node_modules）をキャッシュする
2. The GitHub Actions shall Turborepoのリモートキャッシュまたはローカルキャッシュを活用する
3. When 可能な場合, the GitHub Actions shall テスト、Lint、型チェックを並列実行する
4. The GitHub Actions shall 不要なステップをスキップして実行時間を最小化する


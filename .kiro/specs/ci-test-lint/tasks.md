# Implementation Plan

## Task 1: ルートプロジェクトにテスト環境を追加

- [x] 1.1 turbo.jsonにtestタスクを追加
  - testタスクを定義
  - outputsを空配列に設定（bun testはキャッシュ不要）
  - _Requirements: 1.1, 1.3, 1.4, 5.3, 5.4_

- [x] 1.2 ルートpackage.jsonにtestスクリプトを追加
  - scriptsにtestコマンドを追加（turbo testを実行）
  - _Requirements: 1.1_

## Task 2: 各ワークスペースにbun test環境を構築

- [x] 2.1 (P) apps/webにtest scriptを追加
  - package.jsonにtestスクリプトを追加（`bun test`）
  - _Requirements: 1.1, 1.2_

- [x] 2.2 (P) apps/serverにtest scriptを追加
  - package.jsonにtestスクリプトを追加（`bun test`）
  - _Requirements: 1.1, 1.2_

- [x] 2.3 (P) packages/authにtest scriptを追加
  - package.jsonにtestスクリプトを追加（`bun test`）
  - _Requirements: 1.1, 1.2_

- [x] 2.4 (P) packages/dbにtest scriptを追加
  - package.jsonにtestスクリプトを追加（`bun test`）
  - サンプルテストファイル（index.test.ts）を作成
  - _Requirements: 1.1, 1.2_

## Task 3: GitHub Actions CIワークフローを作成

- [x] 3.1 CIワークフローファイルを作成
  - .github/workflows/ci.ymlを作成
  - mainブランチへのプッシュとPRでトリガー
  - ubuntu-latestランナーを使用
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3.2 Bunセットアップとキャッシュを設定
  - oven-sh/setup-bun@v2でBunをセットアップ
  - actions/checkout@v6でコードチェックアウト
  - actions/cache@v5でBunキャッシュと.turboキャッシュを設定
  - bun.lockのハッシュをキャッシュキーに使用
  - _Requirements: 2.3, 5.1, 5.2_

- [x] 3.3 CIチェックの実行ステップを追加
  - bun install --frozen-lockfileで依存関係をインストール
  - bun run check && bun run check-types && bun run testで順次実行
  - 失敗時にワークフローが失敗ステータスで終了することを確認
  - _Requirements: 2.4, 2.5, 3.1, 4.1, 5.3_

## Task 4: 動作確認とテスト

- [x] 4.1 ローカルでテスト環境の動作確認
  - bun installで依存関係をインストール
  - bun run testでテストが実行されることを確認
  - 各ワークスペースでbun testが動作することを確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4.2 Lint・型チェックの動作確認
  - bun run checkでBiome lintが動作することを確認
  - bun run check-typesで型チェックが動作することを確認
  - 既存のBiome設定とTypeScript設定が使用されることを確認
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_

- [x] 4.3 CIワークフローのローカルテスト
  - wrkflwでローカルCIテストを実行
  - 全チェック（test, check, check-types）が実行されることを確認
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 5.3_

## Implementation Notes

### Vitest → bun test 変更理由

当初はVitestを使用する予定だったが、以下の理由でbun testに変更：

1. **Bun + Vitestの互換性問題**: VitestはTinypoolを使用しており、`node:child_process`と`node:worker_threads`に依存。BunはこれらのNode.js APIを完全にサポートしていないため、ローカルでVitestがハング（無応答）する問題が発生。
   - 参考: [oven-sh/bun#9170](https://github.com/oven-sh/bun/issues/9170)
   - 参考: [vitest-dev/vitest#7402](https://github.com/vitest-dev/vitest/issues/7402)

2. **bun testの利点**:
   - Bunネイティブのため追加依存関係不要
   - 高速実行（Vitestと比較して大幅に高速）
   - Bun環境との完全な互換性

3. **移行作業**:
   - vitest.config.tsファイルを全ワークスペースから削除
   - vitest依存関係を全package.jsonから削除
   - テストファイルのimportを`vitest`から`bun:test`に変更


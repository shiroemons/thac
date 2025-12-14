# Research & Design Decisions

## Summary
- **Feature**: admin-login
- **Discovery Scope**: Extension（既存認証システムへの管理者ロール機能追加）
- **Key Findings**:
  - Better-Authの`admin`プラグインが管理者ロール管理に最適
  - TanStack Routerの`beforeLoad`フックで保護ルートを実装可能
  - 既存のuserテーブルに`role`フィールドを追加するスキーマ拡張が必要

## Research Log

### Better-Auth Admin Plugin
- **Context**: 管理者ロール管理機能の実装方法調査
- **Sources Consulted**:
  - Better-Auth公式ドキュメント（admin plugin）
  - Context7ライブラリドキュメント
- **Findings**:
  - `admin`プラグインがユーザーロール管理を提供
  - スキーマ拡張：userテーブルに`role`（string）、`banned`（boolean）、`banReason`（string）、`banExpires`（date）フィールドを追加
  - sessionテーブルに`impersonatedBy`（string）フィールドを追加
  - `adminRoles`オプションで管理者として認識されるロールを設定可能（デフォルト: `["admin"]`）
  - `defaultRole`オプションで新規ユーザーのデフォルトロールを設定可能（デフォルト: `"user"`）
  - `createAccessControl`でカスタムアクセス制御を定義可能
- **Implications**:
  - `@thac/auth`パッケージにadminプラグインを追加
  - DBスキーマのマイグレーションが必要
  - クライアント側に`adminClient`プラグインを追加

### TanStack Router Protected Routes
- **Context**: 管理者専用ルートの保護方法調査
- **Sources Consulted**:
  - TanStack Router公式ドキュメント（authentication guide）
- **Findings**:
  - `beforeLoad`フックで認証チェックを実装
  - `redirect`をthrowすることで未認証ユーザーをリダイレクト
  - レイアウトルート（`_admin`）でネストされたルートを一括保護可能
  - `location.href`を保存してログイン後のリダイレクトに使用
- **Implications**:
  - `routes/admin/_admin.tsx`レイアウトルートを作成
  - `beforeLoad`で管理者ロールチェックを実装
  - 403 Forbiddenページの作成が必要

### 既存コードベースパターン
- **Context**: 既存の認証実装パターンの把握
- **Sources Consulted**:
  - `packages/auth/src/index.ts`
  - `packages/db/src/schema/auth.ts`
  - `apps/web/src/components/sign-in-form.tsx`
  - `apps/web/src/lib/auth-client.ts`
- **Findings**:
  - Better-Authが`betterAuth()`で設定済み
  - Drizzle ORMでSQLiteスキーマ定義
  - `authClient`を`@/lib/auth-client`からインポートして使用
  - TanStack Formでフォームバリデーション
  - Zodでスキーマバリデーション
  - `sonner`でトースト通知
- **Implications**:
  - 既存パターンに従ってadminログインフォームを実装
  - 既存の`SignInForm`を参考にコンポーネント構造を設計

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Better-Auth admin plugin | Better-Auth標準のadminプラグイン使用 | 型安全、既存認証と統合、豊富なAPI | プラグイン依存、カスタマイズに制限あり | 推奨 |
| カスタムロール実装 | 独自のロール管理を一から実装 | 完全なカスタマイズ性 | 開発工数増、車輪の再発明 | 非推奨 |

## Design Decisions

### Decision: Better-Auth admin pluginの採用
- **Context**: 管理者ロール管理機能の実装アプローチ選定
- **Alternatives Considered**:
  1. Better-Auth admin plugin — 標準プラグインを使用
  2. カスタム実装 — 独自のロール管理を実装
- **Selected Approach**: Better-Auth admin pluginを使用
- **Rationale**:
  - 既存のBetter-Auth認証基盤と完全に統合
  - 型安全なAPIを提供
  - スキーマ拡張が自動的に処理される
  - 将来的なアクセス制御拡張にも対応可能
- **Trade-offs**:
  - プラグインの仕様に依存
  - 細かいカスタマイズには制限がある場合あり
- **Follow-up**: プラグインバージョンアップ時の互換性確認

### Decision: 専用Admin用ログインページの作成
- **Context**: 管理者ログインのUIアプローチ選定
- **Alternatives Considered**:
  1. 専用ページ（/admin/login） — 管理者専用のログインUI
  2. 既存ログインページの拡張 — 一般ユーザーと同じページで分岐
- **Selected Approach**: 専用ページ（/admin/login）を作成
- **Rationale**:
  - セキュリティ上、管理者エントリポイントを分離
  - UIを管理者向けにカスタマイズ可能
  - 一般ユーザーへの露出を防止
- **Trade-offs**:
  - コンポーネントの重複可能性（共通化で対応）
- **Follow-up**: 共通認証フォームコンポーネントの抽出検討

### Decision: TanStack Router beforeLoadでの認証ガード
- **Context**: 保護ルートの実装方法選定
- **Alternatives Considered**:
  1. beforeLoad hook — ルート読み込み前にチェック
  2. コンポーネント内でのチェック — レンダリング時にチェック
- **Selected Approach**: beforeLoad hookを使用
- **Rationale**:
  - フラッシュ（一瞬コンテンツが見える）を防止
  - TanStack Routerの標準パターン
  - ルートコンテキストで認証情報を子ルートに伝播可能
- **Trade-offs**:
  - SSR時の考慮が必要（TanStack Startで対応済み）
- **Follow-up**: エラーバウンダリとの連携確認

## Risks & Mitigations
- **DBマイグレーションリスク** — 既存ユーザーデータへの影響 → デフォルト値を設定し、段階的マイグレーションを実施
- **セッション互換性** — 既存セッションとの互換性 → adminプラグインはオプショナルフィールドを追加するため影響なし
- **パフォーマンス** — 全ルートでのロールチェック → レイアウトルートで一度だけチェックし子ルートに伝播

## References
- [Better-Auth Admin Plugin](https://www.better-auth.com/docs/plugins/admin) — 管理者ロール管理プラグイン
- [TanStack Router Authentication](https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes) — 認証ルートガイド
- [Better-Auth Access Control](https://www.better-auth.com/docs/plugins/admin#access-control) — アクセス制御設定

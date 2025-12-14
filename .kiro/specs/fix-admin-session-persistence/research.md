# Research & Design Decisions

## Summary
- **Feature**: `fix-admin-session-persistence`
- **Discovery Scope**: Extension（既存システムの修正）
- **Key Findings**:
  - 管理画面の`beforeLoad`でリクエストヘッダー（Cookie）が転送されていないことが根本原因
  - ダッシュボード（`dashboard.tsx`）はサーバー関数パターンで正常動作
  - TanStack Start公式ドキュメントで`auth.api.getSession({ headers: request.headers })`パターンが推奨

## Research Log

### TanStack Start SSRでのセッション取得パターン
- **Context**: `beforeLoad`でセッションが取得できない理由の調査
- **Sources Consulted**:
  - Better-Auth公式ドキュメント（TanStack Start Integration）
  - 既存コードベース（`dashboard.tsx`、`middleware/auth.ts`）
- **Findings**:
  - TanStack Startの`beforeLoad`はSSRコンテキストで実行される
  - `authClient.getSession()`はデフォルトでブラウザCookieを期待するが、SSRではヘッダーを明示的に渡す必要がある
  - `authMiddleware`は`request.headers`を`fetchOptions.headers`に渡して正常動作
- **Implications**: サーバー関数経由でヘッダーを転送するパターンを採用

### Better-Auth TanStack Start統合方法
- **Context**: 公式推奨の統合パターンの確認
- **Sources Consulted**:
  - Better-Auth GitHub（`docs/content/docs/integrations/tanstack.mdx`）
- **Findings**:
  - `tanstackStartCookies()`プラグインが提供されているが、サーバー関数内での直接使用には`auth.api.getSession({ headers })`が推奨
  - ミドルウェアパターン: `createMiddleware().server()`で`request.headers`にアクセス可能
  - ルート保護: `server.middleware`オプションでミドルウェアを適用可能
- **Implications**: 既存の`authMiddleware`パターンを再利用するのが最も安全

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: サーバー関数パターン | `getAdminUser()`サーバー関数を作成し`beforeLoad`で呼び出し | 既存パターンとの一貫性、`authMiddleware`再利用、低リスク | 新規ファイル追加 | **採用** |
| B: ルートミドルウェア | `server.middleware`で直接セッション検証 | ファイル数増加なし | `beforeLoad`との統合が複雑、TanStack Start固有 | 不採用 |
| C: tanstackStartCookiesプラグイン | Better-Auth公式プラグイン追加 | 公式サポート、全SSRルートに恩恵 | 影響範囲が広い、既存動作への影響要検証 | 将来検討 |

## Design Decisions

### Decision: サーバー関数パターンの採用
- **Context**: 管理画面でセッションが維持されない問題を最小リスクで修正する必要がある
- **Alternatives Considered**:
  1. Option A — 管理者用サーバー関数を作成し既存パターンに統一
  2. Option B — TanStack Startの`server.middleware`を使用
  3. Option C — `tanstackStartCookies`プラグインを追加
- **Selected Approach**: Option A（サーバー関数パターン）
- **Rationale**:
  - `dashboard.tsx`で動作実績のあるパターン
  - 既存の`authMiddleware`を再利用可能
  - 変更範囲が限定的で影響を予測しやすい
- **Trade-offs**:
  - ✅ 低リスク、既存パターンとの一貫性
  - ❌ 新規ファイル追加（`get-admin-user.ts`）
- **Follow-up**: 将来的にルート数が増えた場合は`tanstackStartCookies`プラグインの採用を検討

### Decision: 管理者ロール検証の配置
- **Context**: 管理者権限チェックをサーバー関数内で行うか、`beforeLoad`で行うか
- **Alternatives Considered**:
  1. サーバー関数内でロール検証まで実施
  2. サーバー関数はセッション取得のみ、`beforeLoad`でロール検証
- **Selected Approach**: サーバー関数はセッション取得のみ、`beforeLoad`でロール検証
- **Rationale**:
  - 既存の`getUser()`パターンと一致
  - `beforeLoad`でのロール検証により、UIコンテキスト（403ページ表示）と連携しやすい
  - 関心の分離（認証 vs 認可）
- **Trade-offs**:
  - ✅ 柔軟性が高い、既存パターンとの一貫性
  - ❌ ロール検証が2箇所に分散（サーバー関数とルート）

## Risks & Mitigations
- **Risk 1**: サーバー関数呼び出しによるレイテンシ増加 — 既に`dashboard.tsx`で同様のパターンを使用しており許容範囲
- **Risk 2**: `authMiddleware`のエラーハンドリング不備 — `throw: true`オプションにより例外がスローされ、適切にキャッチ可能
- **Risk 3**: 将来的な認証パターンの不整合 — 同一パターンを使用することで一貫性を維持

## References
- [Better-Auth TanStack Start Integration](https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/integrations/tanstack.mdx) — 公式統合ガイド
- [Better-Auth FAQ - Session Fetching](https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/reference/faq.mdx) — サーバーサイドセッション取得パターン


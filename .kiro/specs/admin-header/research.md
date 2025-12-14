# Research & Design Decisions

## Summary
- **Feature**: `admin-header`
- **Discovery Scope**: Simple Addition（UIコンポーネントの追加）
- **Key Findings**:
  - 既存のHeaderコンポーネントとUserMenuコンポーネントのパターンを踏襲可能
  - RouteContextからユーザー情報を受け取る設計（`_admin.tsx`で既に実装済み）
  - TanStack RouterのLinkコンポーネントとsonnerのtoastを使用したパターンが確立済み

## Research Log

### 既存コンポーネントパターン
- **Context**: AdminHeaderの設計にあたり、既存のHeader/UserMenuパターンを調査
- **Sources Consulted**: `apps/web/src/components/header.tsx`, `user-menu.tsx`
- **Findings**:
  - Header: `Link`コンポーネントによるナビゲーション、右側にUserMenu配置
  - UserMenu: `authClient.signOut()`でログアウト、`useNavigate`でリダイレクト
  - TailwindCSSによるスタイリング（flex、gap、padding）
- **Implications**: 同様のパターンでAdminHeaderを実装可能

### 管理者レイアウトの構造
- **Context**: AdminHeaderをどこに配置するか確認
- **Sources Consulted**: `apps/web/src/routes/admin/_admin.tsx`, `_admin/index.tsx`
- **Findings**:
  - `_admin.tsx`がレイアウトコンポーネント（AdminLayout）を提供
  - RouteContextで`user`と`isForbidden`を子ルートに伝播
  - 現在は`Outlet`のみを返却（ヘッダーなし）
  - ダッシュボードページ内にログアウトボタンが直接配置されている
- **Implications**: AdminLayoutにAdminHeaderを追加し、ダッシュボードページからログアウトボタンを削除

### 認証クライアントAPI
- **Context**: ログアウト処理のAPI確認
- **Sources Consulted**: `apps/web/src/lib/auth-client.ts`
- **Findings**:
  - `authClient.signOut({ fetchOptions: { onSuccess: () => {...} } })`パターン
  - Better-Authのreactクライアントを使用
- **Implications**: 既存パターンをそのまま使用可能

## Design Decisions

### Decision: AdminHeaderをpropsでユーザー情報を受け取る設計
- **Context**: AdminHeaderがユーザー情報をどのように取得するか
- **Alternatives Considered**:
  1. `authClient.useSession()`をAdminHeader内で呼び出す
  2. propsでユーザー情報を受け取る（親からRouteContext経由）
- **Selected Approach**: propsでユーザー情報を受け取る
- **Rationale**:
  - AdminLayoutがすでにRouteContextでユーザー情報を持っている
  - 追加のAPI呼び出しを避けられる
  - コンポーネントのテスト容易性が向上
- **Trade-offs**: props drilling が発生するが、1レベルのみなので許容範囲

### Decision: ログアウト後のリダイレクト先
- **Context**: 管理者ログアウト後の遷移先
- **Alternatives Considered**:
  1. ホーム（`/`）
  2. 管理者ログインページ（`/admin/login`）
- **Selected Approach**: `/admin/login`
- **Rationale**: 管理者が再ログインしやすいようにする

## Risks & Mitigations
- リスク: ログアウト中のUIフリーズ → ローディング状態の追加は将来の拡張として検討

## References
- TanStack Router Link: https://tanstack.com/router/latest/docs/framework/react/api/router/linkComponent
- Better-Auth signOut: 既存コード参照（`user-menu.tsx`）

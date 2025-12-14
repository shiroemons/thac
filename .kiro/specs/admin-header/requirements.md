# Requirements Document

## Introduction
管理者ページ専用のヘッダーコンポーネントを実装する。現在の管理者ダッシュボードにはヘッダーがなく、各ページにログアウトボタンが直接配置されている状態を改善し、一貫したナビゲーションとユーザー体験を提供する。

## Requirements

### Requirement 1: ヘッダーレイアウト
**Objective:** As a 管理者, I want 管理者ページ専用のヘッダーを表示する, so that 一般ページとは異なる管理者専用UIであることを視覚的に認識できる

#### Acceptance Criteria
1. The AdminHeader shall 管理者レイアウト（`_admin.tsx`）の最上部に固定表示される
2. The AdminHeader shall 「管理者ダッシュボード」のタイトルを左側に表示する
3. The AdminHeader shall 一般ユーザー向けHeaderとは異なるスタイリング（背景色など）で管理者専用UIであることを示す
4. The AdminHeader shall TailwindCSSを使用してスタイリングされる

### Requirement 2: ユーザー情報表示
**Objective:** As a 管理者, I want ヘッダーに自分のユーザー情報が表示される, so that 現在ログイン中のアカウントを確認できる

#### Acceptance Criteria
1. The AdminHeader shall ヘッダー右側にログイン中の管理者名またはメールアドレスを表示する
2. When ユーザー名が存在する場合, the AdminHeader shall ユーザー名を優先して表示する
3. If ユーザー名が存在しない場合, then the AdminHeader shall メールアドレスを表示する

### Requirement 3: ログアウト機能
**Objective:** As a 管理者, I want ヘッダーからログアウトできる, so that 作業終了時にセキュアにセッションを終了できる

#### Acceptance Criteria
1. The AdminHeader shall ヘッダー右側にログアウトボタンを表示する
2. When ログアウトボタンがクリックされた場合, the AdminHeader shall authClient.signOut()を呼び出してセッションを終了する
3. When ログアウトが成功した場合, the AdminHeader shall 「ログアウトしました」のトースト通知を表示する
4. When ログアウトが成功した場合, the AdminHeader shall 管理者ログインページ（/admin/login）にリダイレクトする

### Requirement 4: ナビゲーション
**Objective:** As a 管理者, I want 管理者セクション内でナビゲーションできる, so that 管理機能間を効率的に移動できる

#### Acceptance Criteria
1. The AdminHeader shall ダッシュボードへのリンクをナビゲーションに含める
2. When ナビゲーションリンクがクリックされた場合, the AdminHeader shall TanStack RouterのLinkコンポーネントを使用して遷移する
3. The AdminHeader shall 現在のページに対応するナビゲーションリンクをアクティブ状態で表示する

### Requirement 5: レイアウト統合
**Objective:** As a 開発者, I want AdminHeaderが管理者レイアウトに統合される, so that すべての管理者ページで一貫したヘッダーが表示される

#### Acceptance Criteria
1. The AdminLayout shall AdminHeaderコンポーネントをOutletの前に配置する
2. The AdminHeader shall RouteContextからユーザー情報を受け取って使用する
3. When isForbiddenがtrueの場合, the AdminLayout shall AdminHeaderを表示せずForbiddenPageのみを表示する

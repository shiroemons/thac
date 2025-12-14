# Requirements Document

## Introduction

このドキュメントは、管理者向けログイン機能（Admin Login）の要件を定義します。本機能により、管理者は専用のログイン画面からシステムにアクセスし、管理機能を利用できるようになります。既存のBetter-Auth認証基盤を活用しつつ、管理者専用のアクセス制御を実装します。

## Requirements

### Requirement 1: 管理者ログイン画面

**Objective:** As a 管理者, I want 専用のログイン画面からシステムにログインしたい, so that 一般ユーザーとは分離された管理者専用のアクセスポイントを利用できる

#### Acceptance Criteria

1. When 管理者がAdmin用ログインページ（/admin/login）にアクセスした場合, the Web Application shall ログインフォームを表示する
2. The Web Application shall メールアドレスとパスワードの入力フィールドを提供する
3. When ログインフォームが表示された場合, the Web Application shall ログインボタンを無効状態で表示する
4. While メールアドレスとパスワードが入力されている間, the Web Application shall ログインボタンを有効にする

### Requirement 2: 管理者認証処理

**Objective:** As a 管理者, I want メールアドレスとパスワードで認証したい, so that セキュアにシステムへアクセスできる

#### Acceptance Criteria

1. When 管理者が有効な認証情報でログインを実行した場合, the Auth Service shall セッションを作成し認証トークンを発行する
2. When 認証が成功した場合, the Web Application shall 管理者ダッシュボード（/admin）にリダイレクトする
3. If 無効なメールアドレスまたはパスワードが入力された場合, the Auth Service shall 認証エラーを返却する
4. When 認証エラーが発生した場合, the Web Application shall エラーメッセージを表示する
5. If 存在しないユーザーでログインを試行した場合, the Auth Service shall 同一のエラーメッセージを返却する（タイミング攻撃対策）

### Requirement 3: 管理者ロール管理

**Objective:** As a システム管理者, I want ユーザーに管理者ロールを割り当てたい, so that 管理機能へのアクセスを制御できる

#### Acceptance Criteria

1. The Database shall ユーザーの管理者ロールを格納するフィールドを持つ
2. When 管理者ロールを持たないユーザーがAdmin用ログインを試行した場合, the Auth Service shall アクセス拒否エラーを返却する
3. When アクセス拒否エラーが発生した場合, the Web Application shall 「管理者権限がありません」というメッセージを表示する

### Requirement 4: 管理者セッション管理

**Objective:** As a 管理者, I want セキュアなセッション管理を利用したい, so that 不正アクセスから保護される

#### Acceptance Criteria

1. The Auth Service shall 管理者セッションに有効期限を設定する
2. When セッションが有効期限切れになった場合, the Web Application shall 自動的にログイン画面にリダイレクトする
3. When 管理者がログアウトを実行した場合, the Auth Service shall セッションを無効化する
4. When ログアウトが完了した場合, the Web Application shall Admin用ログイン画面にリダイレクトする

### Requirement 5: 管理者保護ルート

**Objective:** As a システム, I want 管理者ページへのアクセスを制限したい, so that 認証されていないユーザーからシステムを保護できる

#### Acceptance Criteria

1. When 未認証のユーザーが/admin配下のページにアクセスした場合, the Web Application shall Admin用ログイン画面にリダイレクトする
2. When 認証済みだが管理者ロールを持たないユーザーが/admin配下のページにアクセスした場合, the Web Application shall 403 Forbiddenページを表示する
3. While 管理者としてログイン中の場合, the Web Application shall /admin配下のすべてのページへのアクセスを許可する

### Requirement 6: ログインフォームバリデーション

**Objective:** As a 管理者, I want 入力内容が検証されたフォームを使いたい, so that 入力ミスを防げる

#### Acceptance Criteria

1. When 無効なメールアドレス形式が入力された場合, the Web Application shall バリデーションエラーを表示する
2. When パスワードフィールドが空の状態でログインを試行した場合, the Web Application shall 必須入力エラーを表示する
3. While ログイン処理中の場合, the Web Application shall ローディングインジケーターを表示しフォームを無効化する

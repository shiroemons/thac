# Requirements Document

## Introduction

本ドキュメントは、管理画面でログイン後にページを更新するとログインページにリダイレクトされる問題の修正要件を定義する。現在の実装ではBetter-Authによるセッション管理が行われているが、ページリフレッシュ時にセッションが正しく永続化されていない。この問題を解決し、ユーザーがページを更新してもログイン状態が維持されるようにする。

## Requirements

### Requirement 1: セッション永続化

**Objective:** 管理者として、ページを更新してもログイン状態が維持されることで、作業を中断されることなく管理タスクを継続できる

#### Acceptance Criteria

1. When 管理者がログイン後にブラウザでページを更新する, the Web App shall 既存のセッションを維持し、現在のページを表示する
2. When 管理者が管理画面内でナビゲーションを行う, the Web App shall セッション状態を維持し、認証情報を保持する
3. While 有効なセッションが存在する, the Web App shall ログインページへのリダイレクトを行わない
4. If セッションの有効期限が切れている, then the Web App shall ログインページにリダイレクトし、再認証を促す

### Requirement 2: Cookie設定の適正化

**Objective:** 開発者として、認証Cookieが適切に設定されることで、クロスオリジン環境でもセッションが維持される

#### Acceptance Criteria

1. When 認証が成功する, the Auth Server shall HTTPOnly、Secure、適切なSameSite属性を持つCookieを設定する
2. When クライアントがAPIリクエストを送信する, the Web App shall Cookieを含めたリクエストを送信する（credentials: include）
3. While 開発環境でローカルホストを使用している, the Auth Server shall 開発環境に適したCookie設定を適用する

### Requirement 3: 認証状態の確認処理

**Objective:** 管理者として、ページロード時に認証状態が正しく確認されることで、不要なリダイレクトが発生しない

#### Acceptance Criteria

1. When 管理画面のルートがロードされる, the Web App shall サーバーサイドでセッションの有効性を確認する
2. When セッション確認中にエラーが発生する, the Web App shall 適切なエラーハンドリングを行い、ユーザーに通知する
3. If セッション確認の結果が有効である, then the Web App shall ログインページへのリダイレクトをスキップしてコンテンツを表示する

### Requirement 4: CORS設定の整合性

**Objective:** 開発者として、CORS設定が認証フローと整合することで、クロスオリジンリクエストでCookieが正しく送受信される

#### Acceptance Criteria

1. The Auth Server shall CORS設定でcredentials: trueを許可する
2. The Auth Server shall 許可されたオリジンからのリクエストに対してCookieを受け入れる
3. When クロスオリジンリクエストが発生する, the Auth Server shall プリフライトリクエストに適切に応答する


# Requirements Document

## Introduction

本ドキュメントは、音楽リリース（アルバム、シングル、EP、配信、動画公開など）とそれに含まれるディスク、およびリリースに関与したサークルを管理する機能の要件を定義する。既存の管理画面（イベント管理、アーティスト管理など）と同等のUI/UXを提供し、Drizzle ORM + SQLiteのベストプラクティスに従う。

## Requirements

### Requirement 1: リリースデータモデル（SQLite/Drizzle）
**Objective:** As a 開発者, I want リリースのデータ構造をDrizzle ORM + SQLite形式で定義したい, so that 既存のスキーマパターンと一貫性を保てる

#### Acceptance Criteria
1. The Release Schema shall `packages/db/src/schema/release.ts`に配置される
2. The Release Schema shall 以下のカラムを持つ:
   - `id`: text型、主キー（nanoid生成）
   - `name`: text型、必須（リリース名）
   - `nameJa`: text型、任意（日本語名）
   - `nameEn`: text型、任意（英語名）
   - `catalogNumber`: text型、任意（カタログ番号）
   - `releaseDate`: text型、任意（YYYY-MM-DD形式）
   - `releaseType`: text型、任意（album, single, ep, digital_single, video_single等）
   - `eventDayId`: text型、任意（イベント開催日への外部キー、SET NULL on delete）
   - `notes`: text型、任意（JSON文字列として自由メタ情報）
   - `createdAt`: integer型（timestamp_ms）、自動設定
   - `updatedAt`: integer型（timestamp_ms）、自動更新
3. The Release Schema shall `releaseDate`、`releaseType`、`eventDayId`、`catalogNumber`にインデックスを持つ
4. The Release Schema shall Zodバリデーションスキーマを`release.validation.ts`に定義する

### Requirement 2: ディスクデータモデル（SQLite/Drizzle）
**Objective:** As a 開発者, I want ディスクのデータ構造をDrizzle ORM + SQLite形式で定義したい, so that リリース内のディスクを適切に管理できる

#### Acceptance Criteria
1. The Disc Schema shall `packages/db/src/schema/release.ts`内に定義される
2. The Disc Schema shall 以下のカラムを持つ:
   - `id`: text型、主キー（nanoid生成）
   - `releaseId`: text型、必須（リリースへの外部キー、CASCADE on delete）
   - `discNumber`: integer型、必須（1から開始）
   - `discName`: text型、任意（ディスク名やサブタイトル）
   - `createdAt`: integer型（timestamp_ms）、自動設定
   - `updatedAt`: integer型（timestamp_ms）、自動更新
3. The Disc Schema shall `releaseId`と`discNumber`の組み合わせでユニーク制約を持つ
4. The Disc Schema shall Zodバリデーションスキーマを`release.validation.ts`に定義する

### Requirement 3: リリースサークル関連テーブル
**Objective:** As a 開発者, I want リリースとサークルの関連をロール付きで管理したい, so that 制作・頒布の役割を記録できる

#### Acceptance Criteria
1. The ReleaseCircle Schema shall `packages/db/src/schema/release.ts`内に定義される
2. The ReleaseCircle Schema shall 以下のカラムを持つ:
   - `releaseId`: text型、必須（リリースへの外部キー、CASCADE on delete）
   - `circleId`: text型、必須（サークルへの外部キー、RESTRICT on delete）
   - `role`: text型、必須（arrange, release等の役割）
   - `position`: integer型、デフォルト1（表示順）
3. The ReleaseCircle Schema shall `(releaseId, circleId, role)`を複合主キーとする

### Requirement 4: リリース一覧表示
**Objective:** As a 管理者, I want リリースの一覧を確認したい, so that 登録されているリリースを把握できる

#### Acceptance Criteria
1. When 管理者がリリース一覧ページにアクセスした場合, the Admin UI shall 登録されているリリースの一覧を表示する
2. The Admin UI shall 以下のカラムを表示する: ID、リリース名、カタログ番号、リリースタイプ、発売日、ディスク数、作成日時、更新日時
3. The Admin UI shall カラム表示切り替え機能を提供する（useColumnVisibilityフック使用）
4. The Admin UI shall ページネーション機能を提供する（DataTablePagination使用）
5. The Admin UI shall リリース名での検索機能を提供する（デバウンス付き）
6. The Admin UI shall リリースタイプでのフィルタ機能を提供する

### Requirement 5: リリース作成
**Objective:** As a 管理者, I want 新しいリリースを登録したい, so that 音楽コンテンツを管理できる

#### Acceptance Criteria
1. When 管理者がリリース作成フォームを送信した場合, the API Server shall 新しいリリースをデータベースに保存する
2. When リリース名が空の場合, the API Server shall バリデーションエラーを返す
3. When IDが既に存在する場合, the API Server shall 409エラーを返す
4. When リリースが正常に作成された場合, the Admin UI shall 成功メッセージを表示し、一覧を更新する
5. If リリース作成に失敗した場合, the Admin UI shall エラーメッセージを表示する

### Requirement 6: リリース編集
**Objective:** As a 管理者, I want 既存のリリース情報を更新したい, so that 誤った情報を修正できる

#### Acceptance Criteria
1. When 管理者がリリース編集フォームを送信した場合, the API Server shall リリース情報を更新する
2. When 存在しないリリースIDが指定された場合, the API Server shall 404エラーを返す
3. When リリースが正常に更新された場合, the Admin UI shall 成功メッセージを表示する
4. The Admin UI shall 編集ダイアログ内でディスク一覧を表示し、ディスクの追加・編集・削除を可能にする

### Requirement 7: リリース削除
**Objective:** As a 管理者, I want 不要なリリースを削除したい, so that データを整理できる

#### Acceptance Criteria
1. When 管理者がリリース削除を実行した場合, the Admin UI shall 削除確認ダイアログ（confirm）を表示する
2. When 削除が確認された場合, the API Server shall リリースと関連するディスクを削除する（CASCADE）
3. When リリースが正常に削除された場合, the Admin UI shall 成功メッセージを表示し、一覧を更新する
4. If リリース削除に失敗した場合, the Admin UI shall エラーメッセージを表示する

### Requirement 8: ディスク一覧表示
**Objective:** As a 管理者, I want リリースに含まれるディスクの一覧を確認したい, so that ディスク構成を把握できる

#### Acceptance Criteria
1. When 管理者がリリース編集ダイアログを開いた場合, the Admin UI shall そのリリースに属するディスクの一覧を表示する
2. The Admin UI shall ディスク番号順にディスクを表示する
3. The Admin UI shall 各ディスクのディスク番号とディスク名をBadgeとともに表示する

### Requirement 9: ディスク作成
**Objective:** As a 管理者, I want リリースにディスクを追加したい, so that 複数ディスクのリリースを管理できる

#### Acceptance Criteria
1. When 管理者がディスク追加ボタンをクリックした場合, the Admin UI shall ディスク追加ダイアログを表示する
2. When ディスク作成フォームを送信した場合, the API Server shall 新しいディスクをリリースに追加する
3. When ディスク番号が空または不正な値の場合, the API Server shall バリデーションエラーを返す
4. When 同一リリース内に同じディスク番号が既に存在する場合, the API Server shall 409重複エラーを返す
5. When ディスクが正常に作成された場合, the Admin UI shall ディスク一覧を更新する

### Requirement 10: ディスク編集
**Objective:** As a 管理者, I want ディスク情報を更新したい, so that 誤った情報を修正できる

#### Acceptance Criteria
1. When 管理者がディスク編集ボタンをクリックした場合, the Admin UI shall ディスク編集ダイアログを表示する
2. When ディスク編集フォームを送信した場合, the API Server shall ディスク情報を更新する
3. When 存在しないディスクIDが指定された場合, the API Server shall 404エラーを返す
4. When ディスクが正常に更新された場合, the Admin UI shall ディスク一覧を更新する

### Requirement 11: ディスク削除
**Objective:** As a 管理者, I want 不要なディスクを削除したい, so that ディスク構成を修正できる

#### Acceptance Criteria
1. When 管理者がディスク削除ボタンをクリックした場合, the Admin UI shall 削除確認ダイアログ（confirm）を表示する
2. When 削除が確認された場合, the API Server shall ディスクを削除する
3. When ディスクが正常に削除された場合, the Admin UI shall ディスク一覧を更新する

### Requirement 12: リリースAPIエンドポイント
**Objective:** As a 開発者, I want リリースを操作するRESTful APIを提供したい, so that フロントエンドからデータを操作できる

#### Acceptance Criteria
1. The API Server shall 以下のエンドポイントを提供する:
   - `GET /admin/releases`: リリース一覧取得（ページネーション、検索、フィルタ対応）
   - `GET /admin/releases/:id`: リリース詳細取得（ディスク一覧を含む）
   - `POST /admin/releases`: リリース新規作成
   - `PUT /admin/releases/:id`: リリース更新
   - `DELETE /admin/releases/:id`: リリース削除
2. The API Server shall リクエストボディのバリデーションにZodスキーマを使用する
3. The API Server shall 適切なHTTPステータスコードを返す（200, 201, 400, 404, 409, 500）
4. While ユーザーが認証されていない場合, the API Server shall 401エラーを返す

### Requirement 13: ディスクAPIエンドポイント
**Objective:** As a 開発者, I want ディスクを操作するRESTful APIを提供したい, so that フロントエンドからディスクデータを操作できる

#### Acceptance Criteria
1. The API Server shall 以下のエンドポイントを提供する:
   - `GET /admin/releases/:releaseId/discs`: ディスク一覧取得
   - `POST /admin/releases/:releaseId/discs`: ディスク新規作成
   - `PUT /admin/releases/:releaseId/discs/:id`: ディスク更新
   - `DELETE /admin/releases/:releaseId/discs/:id`: ディスク削除
2. The API Server shall リクエストボディのバリデーションにZodスキーマを使用する
3. When 存在しないリリースIDが指定された場合, the API Server shall 404エラーを返す

### Requirement 14: フロントエンドAPIクライアント
**Objective:** As a 開発者, I want リリースとディスクのAPIクライアントを実装したい, so that フロントエンドから型安全にAPIを呼び出せる

#### Acceptance Criteria
1. The API Client shall `apps/web/src/lib/api-client.ts`に`releasesApi`と`discsApi`を追加する
2. The API Client shall 既存の`eventsApi`パターンに従い、list/get/create/update/deleteメソッドを提供する
3. The API Client shall TypeScript型定義（Release, Disc, ReleaseWithDiscs等）をエクスポートする

### Requirement 15: 管理画面ルーティング
**Objective:** As a 開発者, I want リリース管理ページを管理画面に追加したい, so that 管理者がアクセスできる

#### Acceptance Criteria
1. The Admin UI shall `/admin/releases`ルートにリリース管理ページを配置する
2. The Admin UI shall 既存の管理画面レイアウト（`_admin.tsx`）内に表示する
3. The Admin UI shall サイドバーにリリース管理へのリンクを追加する


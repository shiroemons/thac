# Requirements Document

## Introduction

本仕様書は、イベント管理機能の要件を定義する。

### データモデル概要
- **イベントシリーズ (event_series)**: イベントの親シリーズ（例: コミックマーケット）
- **イベント (events)**: シリーズに属する個別イベント（例: コミックマーケット108）
- **イベント開催日 (event_days)**: イベントの各開催日（1日目、2日目など）

### 管理方針
- イベント管理画面からイベントシリーズも作成可能
- イベント開催日はイベント編集画面内で管理（サークル外部リンクと同様のパターン）
- 管理者のみがCRUD操作を実行可能

## Requirements

### Requirement 1: イベントシリーズ管理

**Objective:** As a 管理者, I want イベントシリーズを管理したい, so that 同一シリーズのイベントを整理できる

#### Acceptance Criteria
1. The API Server shall イベントシリーズ一覧を取得するエンドポイントを提供する
2. When 管理者が新規イベントシリーズを作成した時, the API Server shall シリーズをデータベースに保存する
3. The API Server shall シリーズ名の重複を大文字小文字無視でチェックする
4. If 同名のシリーズが既に存在する場合, then the API Server shall 409エラーを返す
5. When イベントが紐づいているシリーズを削除しようとした時, the API Server shall 削除を拒否する（RESTRICT）

### Requirement 2: イベント一覧表示

**Objective:** As a 管理者, I want イベントの一覧を閲覧したい, so that 登録済みイベントを確認・管理できる

#### Acceptance Criteria
1. When 管理者がイベント一覧ページにアクセスした時, the Web App shall イベントの一覧を表示する
2. The Web App shall 各イベントの名前、シリーズ名、回次、開催期間、会場を一覧に表示する
3. The Web App shall ページネーションでイベント一覧を分割表示する
4. When 管理者がシリーズでフィルタリングした時, the Web App shall 該当シリーズのイベントのみを表示する
5. When 管理者が検索キーワードを入力した時, the Web App shall イベント名に一致するイベントを表示する

### Requirement 3: イベント作成

**Objective:** As a 管理者, I want 新しいイベントを作成したい, so that イベント情報を登録できる

#### Acceptance Criteria
1. When 管理者がイベント作成ダイアログを開いた時, the Web App shall イベントシリーズの選択肢を表示する
2. When 管理者が新規シリーズ名を入力した時, the Web App shall 新しいシリーズを作成してイベントに紐づける
3. The Web App shall イベント作成時に必須項目（シリーズ、イベント名）の入力を要求する
4. When 管理者がイベント作成フォームを送信した時, the API Server shall 新しいイベントをデータベースに保存する
5. If 同一シリーズ内で同じ回次のイベントが既に存在する場合, then the API Server shall 409エラーを返す
6. When イベントの作成が成功した時, the Web App shall 成功メッセージを表示する

### Requirement 4: イベント編集

**Objective:** As a 管理者, I want 既存のイベント情報を編集したい, so that イベント情報を最新に保てる

#### Acceptance Criteria
1. When 管理者がイベントを選択した時, the Web App shall イベント編集ダイアログを表示する
2. The Web App shall 編集フォームに既存のイベント情報をプリフィルする
3. When 管理者がイベント編集フォームを送信した時, the API Server shall イベント情報を更新する
4. If 編集対象のイベントが存在しない場合, then the API Server shall 404エラーを返す
5. When イベントの編集が成功した時, the Web App shall 成功メッセージを表示する

### Requirement 5: イベント削除

**Objective:** As a 管理者, I want 不要なイベントを削除したい, so that 一覧を整理できる

#### Acceptance Criteria
1. The Web App shall 削除前に確認ダイアログを表示する
2. When 管理者がイベント削除を確認した時, the API Server shall イベントをデータベースから削除する
3. When イベントが削除された時, the API Server shall 関連するイベント開催日も削除する（CASCADE）
4. When イベントの削除が成功した時, the Web App shall 成功メッセージを表示する
5. If 削除対象のイベントが存在しない場合, then the API Server shall 404エラーを返す

### Requirement 6: イベント開催日管理

**Objective:** As a 管理者, I want イベントの開催日を管理したい, so that 各日程の情報を正確に記録できる

#### Acceptance Criteria
1. When 管理者がイベント編集ダイアログを開いた時, the Web App shall 登録済みの開催日一覧を表示する
2. When 管理者が開催日を追加した時, the API Server shall 開催日をデータベースに保存する
3. The Web App shall 開催日追加時に日番号と日付の入力を要求する
4. If 同一イベント内で同じ日番号が既に存在する場合, then the API Server shall 409エラーを返す
5. If 同一イベント内で同じ日付が既に存在する場合, then the API Server shall 409エラーを返す
6. When 管理者が開催日を削除した時, the API Server shall 開催日をデータベースから削除する
7. The Web App shall 開催日を日番号順で表示する

### Requirement 7: データバリデーション

**Objective:** As a システム, I want 入力データを検証したい, so that データの整合性を保てる

#### Acceptance Criteria
1. The API Server shall 日付フィールドをYYYY-MM-DD形式で検証する
2. The API Server shall イベント名を200文字以内に制限する
3. The API Server shall シリーズ名を200文字以内に制限する
4. If バリデーションエラーが発生した場合, then the API Server shall 400エラーと詳細なエラー情報を返す
5. The Web App shall バリデーションエラーを各フィールドに表示する

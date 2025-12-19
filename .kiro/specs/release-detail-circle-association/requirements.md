# Requirements Document

## Introduction

本仕様は、作品（Release）管理機能の拡張を定義する。現在の作品管理はダイアログベースの編集のみだが、より詳細な情報表示と関連データ管理を行うための専用詳細画面を追加する。また、作品とサークルを関連付ける機能を実装し、どのサークルがどの作品をリリースしたかを管理可能にする。

## Requirements

### Requirement 1: 作品詳細画面

**Objective:** As a 管理者, I want 作品の詳細情報を専用ページで確認・編集したい, so that 一覧画面のダイアログよりも広い画面で情報を管理できる

#### Acceptance Criteria

1. When ユーザーが作品一覧で作品名またはリンクをクリックする, the 作品管理システム shall 作品詳細画面（`/admin/releases/:id`）に遷移する
2. When 作品詳細画面が読み込まれる, the 作品管理システム shall 作品の基本情報（作品名、日本語名、英語名、カタログ番号、タイプ、発売日、メモ）を表示する
3. When ユーザーが編集ボタンをクリックする, the 作品管理システム shall 作品の基本情報を編集可能なフォームに切り替える
4. When ユーザーが編集フォームで保存をクリックする, the 作品管理システム shall 変更内容をAPIに送信し、成功時は表示モードに戻る
5. If 作品が存在しない場合, then the 作品管理システム shall 「作品が見つかりません」エラーメッセージを表示し、一覧画面へ戻るリンクを提供する
6. The 作品管理システム shall 詳細画面にパンくずナビゲーション（作品管理 > 作品名）を表示する
7. When ユーザーが一覧に戻るボタンをクリックする, the 作品管理システム shall 作品一覧画面に遷移する

### Requirement 2: 詳細画面でのディスク管理

**Objective:** As a 管理者, I want 詳細画面でディスクの一覧表示・追加・編集・削除を行いたい, so that 作品に紐づくディスク情報を一元管理できる

#### Acceptance Criteria

1. When 作品詳細画面が表示される, the 作品管理システム shall 作品に紐づくディスク一覧をディスク番号順に表示する
2. When ユーザーがディスク追加ボタンをクリックする, the 作品管理システム shall ディスク追加ダイアログを表示する
3. When ユーザーがディスクの編集ボタンをクリックする, the 作品管理システム shall 該当ディスクの編集ダイアログを表示する
4. When ユーザーがディスクの削除ボタンをクリックする, the 作品管理システム shall 確認ダイアログを表示し、確認後に削除を実行する
5. While ディスクが0件の場合, the 作品管理システム shall 「ディスクが登録されていません」メッセージを表示する

### Requirement 3: 作品とサークルの関連付け

**Objective:** As a 管理者, I want 作品にサークルを関連付けたい, so that どのサークルがどの作品をリリースしたかを管理できる

#### Acceptance Criteria

1. When 作品詳細画面が表示される, the 作品管理システム shall 関連付けられたサークル一覧を表示順（position）でセクションに表示する
2. When ユーザーがサークル追加ボタンをクリックする, the 作品管理システム shall サークル選択ダイアログを表示する
3. When ユーザーがサークルを選択し追加を確定する, the 作品管理システム shall 選択されたサークルを作品に関連付け（release_circlesテーブルに登録）する
4. The 作品管理システム shall サークル追加時に役割（role）を任意で設定可能にする
5. When ユーザーが関連サークルの削除ボタンをクリックする, the 作品管理システム shall 確認ダイアログを表示し、確認後に関連付けを解除する
6. The 作品管理システム shall 関連サークルの表示順（position）をドラッグ＆ドロップまたは順番変更ボタンで変更可能にする
7. If 関連サークルが0件の場合, then the 作品管理システム shall 「サークルが関連付けられていません」メッセージを表示する

### Requirement 4: サークル選択UI

**Objective:** As a 管理者, I want サークルを簡単に検索・選択したい, so that 大量のサークルから目的のサークルを素早く見つけられる

#### Acceptance Criteria

1. When サークル選択ダイアログが開く, the 作品管理システム shall 登録済みサークルの一覧を表示する
2. When ユーザーが検索ボックスに入力する, the 作品管理システム shall サークル名で絞り込み検索を実行する
3. The 作品管理システム shall 既に関連付け済みのサークルを選択不可（または選択済み表示）にする
4. When ユーザーがサークルを選択して確定する, the 作品管理システム shall ダイアログを閉じ、関連付けを実行する
5. While 検索結果が0件の場合, the 作品管理システム shall 「該当するサークルが見つかりません」メッセージを表示する

### Requirement 5: 作品一覧画面からの詳細画面への導線

**Objective:** As a 管理者, I want 一覧画面から詳細画面へ簡単に移動したい, so that 編集作業をスムーズに行える

#### Acceptance Criteria

1. When 作品一覧が表示される, the 作品管理システム shall 各作品行に詳細画面へのリンク（作品名クリックまたは詳細ボタン）を提供する
2. The 作品管理システム shall 既存の編集ダイアログ機能を維持する（簡易編集用途）
3. When ユーザーが詳細ボタンをクリックする, the 作品管理システム shall 作品詳細画面に遷移する

### Requirement 6: API エンドポイント

**Objective:** As a 開発者, I want 作品とサークルの関連付けを操作するAPIが欲しい, so that フロントエンドから関連データを管理できる

#### Acceptance Criteria

1. The APIサーバー shall `GET /api/releases/:id/circles` で作品に関連付けられたサークル一覧を返す
2. The APIサーバー shall `POST /api/releases/:id/circles` で作品にサークルを関連付ける
3. The APIサーバー shall `DELETE /api/releases/:id/circles/:circleId` で作品とサークルの関連付けを解除する
4. The APIサーバー shall `PATCH /api/releases/:id/circles/:circleId` で関連付けの役割や順序を更新する
5. If 存在しない作品IDが指定された場合, then the APIサーバー shall 404エラーレスポンスを返す
6. If 既に関連付け済みのサークルを追加しようとした場合, then the APIサーバー shall 409 Conflictエラーを返す

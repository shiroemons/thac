# Requirements Document

## Introduction

公式作品（OfficialWork）および公式楽曲（OfficialSong）に、YouTube、Spotify、Apple Musicなどの外部公開リンクを紐づけて管理する機能を実装する。これにより、ユーザーは公式コンテンツから各種配信プラットフォームへ直接アクセスできるようになる。

## Requirements

### Requirement 1: 公式作品への公開リンク管理

**Objective:** As a 管理者, I want 公式作品に外部公開リンクを登録・管理したい, so that ユーザーが作品を各配信プラットフォームで視聴できる

#### Acceptance Criteria

1. When 管理者が公式作品詳細画面で「リンク追加」ボタンをクリックした場合, the 管理画面 shall リンク追加ダイアログを表示する
2. When 管理者がリンク追加フォームでプラットフォームとURLを入力して保存した場合, the APIサーバー shall 公開リンクをデータベースに保存し、一覧に追加表示する
3. When 管理者が既存の公開リンクの編集ボタンをクリックした場合, the 管理画面 shall 編集ダイアログにリンク情報を表示する
4. When 管理者が公開リンクの削除ボタンをクリックして確認した場合, the APIサーバー shall リンクを削除し、一覧から除去する
5. The 管理画面 shall 公式作品詳細ページに紐づく公開リンク一覧を表示する

### Requirement 2: 公式楽曲への公開リンク管理

**Objective:** As a 管理者, I want 公式楽曲に外部公開リンクを登録・管理したい, so that ユーザーが楽曲を各配信プラットフォームで視聴できる

#### Acceptance Criteria

1. When 管理者が公式楽曲詳細画面で「リンク追加」ボタンをクリックした場合, the 管理画面 shall リンク追加ダイアログを表示する
2. When 管理者がリンク追加フォームでプラットフォームとURLを入力して保存した場合, the APIサーバー shall 公開リンクをデータベースに保存し、一覧に追加表示する
3. When 管理者が既存の公開リンクの編集ボタンをクリックした場合, the 管理画面 shall 編集ダイアログにリンク情報を表示する
4. When 管理者が公開リンクの削除ボタンをクリックして確認した場合, the APIサーバー shall リンクを削除し、一覧から除去する
5. The 管理画面 shall 公式楽曲詳細ページに紐づく公開リンク一覧を表示する

### Requirement 3: 公開リンクのデータモデル

**Objective:** As a 開発者, I want 公開リンクを適切なスキーマで管理したい, so that データの整合性と拡張性を確保できる

#### Acceptance Criteria

1. The データベーススキーマ shall 公式作品リンク用テーブル（officialWorkLinks）を定義する
2. The データベーススキーマ shall 公式楽曲リンク用テーブル（officialSongLinks）を定義する
3. The 各リンクテーブル shall プラットフォームコード、URL、表示順序を保持する
4. The 各リンクテーブル shall 対象エンティティ（作品または楽曲）への外部キー制約を持つ
5. If 無効なURLが入力された場合, then the APIサーバー shall バリデーションエラーを返す

### Requirement 4: プラットフォームの管理

**Objective:** As a 管理者, I want 対応プラットフォームをマスタ管理したい, so that リンク登録時に一貫性のある選択肢を提供できる

#### Acceptance Criteria

1. The システム shall 既存のplatformsマスタテーブルをプラットフォーム選択肢として使用する
2. When 管理者がリンク追加ダイアログを開いた場合, the 管理画面 shall platformsマスタからプラットフォーム選択肢を表示する
3. The 各公開リンク shall platformsマスタのcodeを外部キーとして参照する

### Requirement 5: 公開リンクの表示順序管理

**Objective:** As a 管理者, I want 公開リンクの表示順序を変更したい, so that 優先度の高いリンクを上位に表示できる

#### Acceptance Criteria

1. The 管理画面 shall 公開リンク一覧に順序変更ボタンを表示する
2. When 管理者が順序変更ボタンをクリックした場合, the APIサーバー shall リンクの表示順序を更新する
3. The 管理画面 shall リンク一覧を表示順序（sortOrder）の昇順で表示する

### Requirement 6: APIエンドポイント

**Objective:** As a 開発者, I want 公開リンクを操作するAPIエンドポイントを提供したい, so that フロントエンドから一貫した方法でデータ操作できる

#### Acceptance Criteria

1. The APIサーバー shall 公式作品リンクのCRUD操作用エンドポイントを提供する（GET/POST/PUT/DELETE）
2. The APIサーバー shall 公式楽曲リンクのCRUD操作用エンドポイントを提供する（GET/POST/PUT/DELETE）
3. The APIサーバー shall 管理者認証ミドルウェアで各エンドポイントを保護する
4. If 認証されていないリクエストが来た場合, then the APIサーバー shall 401エラーを返す


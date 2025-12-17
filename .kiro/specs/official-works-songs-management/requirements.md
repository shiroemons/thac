# Requirements Document

## Introduction

東方Projectの公式作品（ゲーム、CD、書籍など）とそれに収録される公式楽曲を管理するシステム。既存のマスタ管理画面と同様のUI/UXパターンを踏襲しつつ、「公式管理」として独立したナビゲーショングループで提供する。TSVファイルによる初期データ一括登録機能を含む。

### データモデル概要

- **official_works**: 公式作品（1:N関係の親）
- **official_songs**: 公式楽曲（作品に紐づく、自己参照による原曲管理あり）

### 技術的制約

- SQLite（Turso/libsql）+ Drizzle ORM
- 既存のマスタ管理画面のCRUDパターンを踏襲
- `id`はテキスト型の主キー（UUIDまたは任意の識別子）

## Requirements

### Requirement 1: 公式作品（official_works）のデータベーススキーマ

**Objective:** 開発者として、公式作品を格納するSQLite対応のスキーマを定義したい。これにより型安全なデータ操作ができる。

#### Acceptance Criteria

1. The スキーマ shall 以下のカラムを持つofficial_worksテーブルを定義する:
   - `id`: text型、主キー
   - `categoryCode`: text型、必須、official_work_categoriesへの外部キー
   - `name`: text型、必須（作品名）
   - `nameJa`: text型、必須（日本語名）
   - `nameEn`: text型、任意（英語名）
   - `shortNameJa`: text型、任意（短縮名・日本語）
   - `shortNameEn`: text型、任意（短縮名・英語）
   - `seriesCode`: text型、任意（シリーズコード例: TH06）
   - `numberInSeries`: real型、任意（シリーズ内番号）
   - `releaseDate`: text型、任意（リリース日、ISO形式）
   - `officialOrganization`: text型、任意（発行元）
   - `position`: integer型、任意（表示順）
   - `notes`: text型、任意（備考）
   - `createdAt`: integer型（timestamp_ms）、自動設定
   - `updatedAt`: integer型（timestamp_ms）、自動更新
2. The スキーマ shall seriesCodeにユニーク制約（NULL許容）を設定する
3. The スキーマ shall categoryCode、releaseDate、positionにインデックスを作成する
4. The スキーマ shall Zodによるinsert/update/selectバリデーションスキーマを提供する

### Requirement 2: 公式楽曲（official_songs）のデータベーススキーマ

**Objective:** 開発者として、公式楽曲を格納するSQLite対応のスキーマを定義したい。これにより作品と楽曲の関係を管理できる。

#### Acceptance Criteria

1. The スキーマ shall 以下のカラムを持つofficial_songsテーブルを定義する:
   - `id`: text型、主キー
   - `officialWorkId`: text型、任意、official_worksへの外部キー（CASCADE削除）
   - `name`: text型、必須（楽曲名）
   - `nameJa`: text型、必須（日本語名）
   - `nameEn`: text型、任意（英語名）
   - `themeType`: text型、任意（主題区分: character/stage/event/bgm/other等）
   - `composerName`: text型、任意（作曲者名）
   - `isOfficialArrangement`: integer型（boolean）、デフォルトfalse
   - `sourceSongId`: text型、任意、official_songsへの自己参照外部キー（SET NULL削除）
   - `notes`: text型、任意（備考）
   - `createdAt`: integer型（timestamp_ms）、自動設定
   - `updatedAt`: integer型（timestamp_ms）、自動更新
2. The スキーマ shall sourceSongIdが自身のidと等しくないことを保証する（アプリケーションレベル）
3. The スキーマ shall themeType、sourceSongId、officialWorkIdにインデックスを作成する
4. The スキーマ shall Zodによるinsert/update/selectバリデーションスキーマを提供する

### Requirement 3: 公式作品のCRUD API

**Objective:** 開発者として、公式作品のCRUD操作を行うRESTful APIを利用したい。これによりフロントエンドと連携できる。

#### Acceptance Criteria

1. The APIサーバー shall `GET /api/admin/official/works` で作品一覧を返す（ページネーション、検索、カテゴリフィルタ対応）
2. The APIサーバー shall `GET /api/admin/official/works/:id` で個別作品を返す
3. The APIサーバー shall `POST /api/admin/official/works` で新規作品を作成する（バリデーション付き）
4. The APIサーバー shall `PUT /api/admin/official/works/:id` で作品を更新する（idは変更不可）
5. The APIサーバー shall `DELETE /api/admin/official/works/:id` で作品を削除する（関連楽曲もCASCADE削除）
6. When リクエストが認証されていない場合, the APIサーバー shall 401 Unauthorizedを返す
7. If バリデーションエラーの場合, the APIサーバー shall 400 Bad Requestと詳細メッセージを返す

### Requirement 4: 公式楽曲のCRUD API

**Objective:** 開発者として、公式楽曲のCRUD操作を行うRESTful APIを利用したい。これにより楽曲データを管理できる。

#### Acceptance Criteria

1. The APIサーバー shall `GET /api/admin/official/songs` で楽曲一覧を返す（ページネーション、検索、作品フィルタ、themeTypeフィルタ対応）
2. The APIサーバー shall `GET /api/admin/official/songs/:id` で個別楽曲を返す
3. The APIサーバー shall `POST /api/admin/official/songs` で新規楽曲を作成する（バリデーション付き）
4. The APIサーバー shall `PUT /api/admin/official/songs/:id` で楽曲を更新する（idは変更不可）
5. The APIサーバー shall `DELETE /api/admin/official/songs/:id` で楽曲を削除する
6. If sourceSongIdに自身のidを設定しようとした場合, the APIサーバー shall 400 Bad Requestを返す
7. The APIサーバー shall 楽曲取得時に関連する作品情報（名前など）を含めることができる

### Requirement 5: 公式作品の管理画面UI

**Objective:** 管理者として、公式作品を一覧表示・検索・作成・編集・削除できる画面を使いたい。これにより作品データを効率的に管理できる。

#### Acceptance Criteria

1. The 管理画面 shall `/admin/official/works` で公式作品一覧ページを表示する
2. The 管理画面 shall 既存のマスタ管理画面と同じUIコンポーネント（DataTable、Pagination、ActionBar等）を使用する
3. The 管理画面 shall 作品名での部分一致検索機能を提供する
4. The 管理画面 shall カテゴリによるフィルタリング機能を提供する
5. The 管理画面 shall 新規作成ダイアログで全フィールドの入力を受け付ける
6. When 管理者が行をクリックする, the 管理画面 shall 編集ダイアログを表示する
7. When 管理者が削除ボタンをクリックする, the 管理画面 shall 確認後に削除を実行する
8. The 管理画面 shall ページネーション（10/20/50件表示）を提供する

### Requirement 6: 公式楽曲の管理画面UI

**Objective:** 管理者として、公式楽曲を一覧表示・検索・作成・編集・削除できる画面を使いたい。これにより楽曲データを効率的に管理できる。

#### Acceptance Criteria

1. The 管理画面 shall `/admin/official/songs` で公式楽曲一覧ページを表示する
2. The 管理画面 shall 既存のマスタ管理画面と同じUIコンポーネントを使用する
3. The 管理画面 shall 楽曲名での部分一致検索機能を提供する
4. The 管理画面 shall 作品によるフィルタリング機能を提供する
5. The 管理画面 shall themeType（主題区分）によるフィルタリング機能を提供する
6. The 管理画面 shall 新規作成ダイアログで全フィールドの入力を受け付ける（作品選択、原曲選択含む）
7. When 管理者が公式アレンジ楽曲を登録する, the 管理画面 shall 原曲（sourceSongId）を選択できる
8. The 管理画面 shall ページネーション（10/20/50件表示）を提供する

### Requirement 7: ナビゲーション統合（公式管理グループ）

**Objective:** 管理者として、サイドバーから「公式管理」セクションにアクセスしたい。これによりマスタ管理と区別して操作できる。

#### Acceptance Criteria

1. The サイドバー shall 「マスタ管理」とは別に「公式管理」グループを表示する
2. The 「公式管理」グループ shall 以下のメニュー項目を含む:
   - 公式作品（/admin/official/works）
   - 公式楽曲（/admin/official/songs）
3. The サイドバー shall 現在のページに応じてアクティブ状態を表示する
4. The 「公式管理」グループ shall 適切なアイコン（Music、Disc等）を使用する

### Requirement 8: TSVインポート機能

**Objective:** 管理者として、TSVファイルから公式作品・楽曲データを一括登録したい。これにより初期データ投入を効率化できる。

#### Acceptance Criteria

1. The APIサーバー shall `POST /api/admin/official/works/import` でTSVファイルを受け付ける
2. The APIサーバー shall `POST /api/admin/official/songs/import` でTSVファイルを受け付ける
3. The インポート処理 shall TSV形式（タブ区切り、ヘッダー行あり）を解析する
4. The インポート処理 shall 各行をバリデーションスキーマで検証する
5. The インポート処理 shall 既存データがある場合はUPSERT（更新または挿入）を実行する
6. When インポートが完了した場合, the APIサーバー shall 作成件数・更新件数・合計件数を返す
7. If バリデーションエラーがある場合, the APIサーバー shall エラー行と詳細を返す
8. The 管理画面 shall 各一覧ページにインポートボタンとダイアログを表示する

### Requirement 9: ダッシュボード統合

**Objective:** 管理者として、ダッシュボードで公式作品・楽曲の登録件数を確認したい。これにより全体の状況を把握できる。

#### Acceptance Criteria

1. The ダッシュボード shall 公式作品の総件数を表示するカードを含む
2. The ダッシュボード shall 公式楽曲の総件数を表示するカードを含む
3. When カードをクリックする, the ダッシュボード shall 対応する一覧ページに遷移する
4. The 統計API shall officialWorksとofficialSongsの件数を返すように拡張する


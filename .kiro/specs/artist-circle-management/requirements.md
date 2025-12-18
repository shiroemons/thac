# Requirements Document

## Project Description (Input)
アーティストやサークルの管理

## Introduction
同人音楽データベースにおいて、アーティスト（個人クリエイター）、アーティスト別名義、サークル（制作グループ）の情報を効率的に管理するための機能を提供する。アーティストは複数の別名義を持つことができ、サークルは外部リンク（公式サイト、SNS等）を複数登録できる。管理者が既存の管理画面と同様のUIパターンを通じて、CRUD操作、検索、フィルタリングを実行できることを目指す。

## Requirements

### Requirement 1: アーティスト基本情報管理
**Objective:** 管理者として、アーティストの基本情報を登録・編集・削除できるようにすることで、データベースの正確性を維持したい

#### Acceptance Criteria
1. When 管理者がアーティスト新規登録フォームを送信する, the Artist Management System shall アーティスト名（必須）、日本語名（任意）、英語名（任意）、ソート用名（任意）、頭文字（条件付き）、頭文字の文字種（必須）、備考（任意）を含むレコードをデータベースに保存する
2. When 管理者がアーティスト編集画面で変更を保存する, the Artist Management System shall 既存アーティストの情報を更新し、更新日時を記録する
3. When 管理者がアーティスト削除を確認する, the Artist Management System shall 該当アーティストと関連する別名義をデータベースから削除する
4. The Artist Management System shall アーティスト名の一意性を保証する（大文字小文字区別なし）
5. If アーティスト名が空文字または既に存在する場合, then the Artist Management System shall 適切なエラーメッセージを表示し、登録を拒否する
6. The Artist Management System shall 各アーティストにNanoid形式の一意のIDを自動採番する
7. The Artist Management System shall 作成日時と更新日時を自動的に記録する
8. The Artist Management System shall 頭文字の文字種（latin/hiragana/katakana/kanji/digit/symbol/other）を管理する
9. If 頭文字の文字種がlatin/hiragana/katakanaの場合, then the Artist Management System shall 頭文字（1文字）の入力を必須とする

### Requirement 2: アーティスト別名義管理
**Objective:** 管理者として、アーティストの別名義を登録・編集・削除できるようにすることで、アーティストの活動名の履歴を正確に管理したい

#### Acceptance Criteria
1. When 管理者がアーティスト別名義新規登録フォームを送信する, the Artist Alias Management System shall 親アーティストID（必須）、別名義名（必須）、別名義種別（任意）、頭文字（条件付き）、頭文字の文字種（必須）、使用開始日（任意）、使用終了日（任意）を含むレコードをデータベースに保存する
10. When 管理者が別名義登録時に親アーティストが存在しない場合, the Artist Alias Management System shall アーティスト選択欄から「新規作成」ボタンでアーティスト作成ダイアログを開き、インラインでアーティストを新規作成できる
11. When インラインでアーティストが作成された場合, the Artist Alias Management System shall 作成されたアーティストを自動的に親アーティストとして選択する
2. When 管理者がアーティスト別名義編集画面で変更を保存する, the Artist Alias Management System shall 既存別名義の情報を更新し、更新日時を記録する
3. When 管理者がアーティスト別名義削除を確認する, the Artist Alias Management System shall 該当別名義をデータベースから削除する
4. The Artist Alias Management System shall 同一アーティスト内での別名義名の一意性を保証する（大文字小文字区別なし）
5. If 同一アーティストに同じ別名義名が既に存在する場合, then the Artist Alias Management System shall 適切なエラーメッセージを表示し、登録を拒否する
6. The Artist Alias Management System shall 各別名義にNanoid形式の一意のIDを自動採番する
7. When 親アーティストが削除される, the Artist Alias Management System shall 関連するすべての別名義を自動的に削除する（カスケード削除）
8. The Artist Alias Management System shall 別名義種別としてマスタデータ（alias_types）を参照する
9. The Artist Alias Management System shall 使用期間（開始日〜終了日）をISO 8601日付形式で管理する

### Requirement 3: サークル基本情報管理
**Objective:** 管理者として、サークルの基本情報を登録・編集・削除できるようにすることで、制作グループの情報を正確に管理したい

#### Acceptance Criteria
1. When 管理者がサークル新規登録フォームを送信する, the Circle Management System shall サークル名（必須）、日本語名（任意）、英語名（任意）、頭文字（条件付き）、頭文字の文字種（必須）、備考（任意）を含むレコードをデータベースに保存する
2. When 管理者がサークル編集画面で変更を保存する, the Circle Management System shall 既存サークルの情報を更新し、更新日時を記録する
3. When 管理者がサークル削除を確認する, the Circle Management System shall 該当サークルと関連する外部リンクをデータベースから削除する
4. The Circle Management System shall サークル名の一意性を保証する（大文字小文字区別なし）
5. If サークル名が空文字または既に存在する場合, then the Circle Management System shall 適切なエラーメッセージを表示し、登録を拒否する
6. The Circle Management System shall 各サークルにNanoid形式の一意のIDを自動採番する
7. The Circle Management System shall 作成日時と更新日時を自動的に記録する
8. The Circle Management System shall 頭文字の文字種（latin/hiragana/katakana/kanji/digit/symbol/other）を管理する
9. If 頭文字の文字種がlatin/hiragana/katakanaの場合, then the Circle Management System shall 頭文字（1文字）の入力を必須とする

### Requirement 4: サークル外部リンク管理
**Objective:** 管理者として、サークルの外部リンク（公式サイト、SNS等）を登録・編集・削除できるようにすることで、サークルの連絡先・活動場所を管理したい

#### Acceptance Criteria
1. When 管理者がサークル外部リンク新規登録フォームを送信する, the Circle Link Management System shall サークルID（必須）、プラットフォームID（必須）、URL（必須）、プラットフォーム内ID（任意）、ハンドル（任意）、公式フラグ（デフォルトtrue）、代表フラグ（デフォルトfalse）を含むレコードをデータベースに保存する
2. When 管理者がサークル外部リンク編集画面で変更を保存する, the Circle Link Management System shall 既存リンクの情報を更新し、更新日時を記録する
3. When 管理者がサークル外部リンク削除を確認する, the Circle Link Management System shall 該当リンクをデータベースから削除する
4. The Circle Link Management System shall 同一サークル内でのURLの一意性を保証する
5. If 同一サークルに同じURLが既に存在する場合, then the Circle Link Management System shall 適切なエラーメッセージを表示し、登録を拒否する
6. The Circle Link Management System shall 各リンクにNanoid形式の一意のIDを自動採番する
7. When 親サークルが削除される, the Circle Link Management System shall 関連するすべての外部リンクを自動的に削除する（カスケード削除）
8. The Circle Link Management System shall プラットフォームとしてマスタデータ（platforms）を参照する
9. If プラットフォームが削除される場合, then the Circle Link Management System shall 外部キー制約により削除を制限する

### Requirement 5: アーティスト一覧表示と検索
**Objective:** 管理者として、アーティストを効率的に検索・閲覧できるようにすることで、目的のアーティストを素早く見つけたい

#### Acceptance Criteria
1. When 管理者がアーティスト一覧画面にアクセスする, the Artist List View shall 登録されているすべてのアーティストをリスト表示する
2. The Artist List View shall アーティスト名の昇順でデフォルトソートする
3. When 管理者が検索フィールドにキーワードを入力する, the Artist List View shall アーティスト名、日本語名、英語名、ソート用名に部分一致するアーティストをフィルタリング表示する
4. The Artist List View shall 各アーティスト項目に編集・削除ボタンを表示する
5. The Artist List View shall ページネーションを実装し、1ページあたり20件表示する
6. The Artist List View shall 頭文字の文字種でフィルタリングできる機能を提供する
7. If 検索結果が0件の場合, then the Artist List View shall 「該当するアーティストが見つかりません」というメッセージを表示する

### Requirement 6: アーティスト別名義一覧表示と検索
**Objective:** 管理者として、アーティスト別名義を効率的に検索・閲覧できるようにすることで、目的の別名義を素早く見つけたい

#### Acceptance Criteria
1. When 管理者がアーティスト別名義一覧画面にアクセスする, the Artist Alias List View shall 登録されているすべての別名義をリスト表示する
2. The Artist Alias List View shall 別名義名の昇順でデフォルトソートする
3. When 管理者が検索フィールドにキーワードを入力する, the Artist Alias List View shall 別名義名に部分一致する別名義をフィルタリング表示する
4. The Artist Alias List View shall アーティストIDでフィルタリングできる機能を提供する
5. The Artist Alias List View shall 各別名義項目に編集・削除ボタンを表示する
6. The Artist Alias List View shall ページネーションを実装し、1ページあたり20件表示する
7. The Artist Alias List View shall 各別名義項目に親アーティスト名を表示する
8. If 検索結果が0件の場合, then the Artist Alias List View shall 「該当する別名義が見つかりません」というメッセージを表示する

### Requirement 7: サークル一覧表示と検索
**Objective:** 管理者として、サークルを効率的に検索・閲覧できるようにすることで、目的のサークルを素早く見つけたい

#### Acceptance Criteria
1. When 管理者がサークル一覧画面にアクセスする, the Circle List View shall 登録されているすべてのサークルをリスト表示する
2. The Circle List View shall サークル名の昇順でデフォルトソートする
3. When 管理者が検索フィールドにキーワードを入力する, the Circle List View shall サークル名、日本語名、英語名に部分一致するサークルをフィルタリング表示する
4. The Circle List View shall 各サークル項目に編集・削除ボタンを表示する
5. The Circle List View shall ページネーションを実装し、1ページあたり20件表示する
6. The Circle List View shall 頭文字の文字種でフィルタリングできる機能を提供する
7. If 検索結果が0件の場合, then the Circle List View shall 「該当するサークルが見つかりません」というメッセージを表示する

### Requirement 8: フォームバリデーション
**Objective:** 管理者として、入力データの妥当性を事前に検証することで、データ品質を保証したい

#### Acceptance Criteria
1. The Form Validation System shall 名前フィールドの最大文字数を適切な値に制限する
2. The Form Validation System shall 備考フィールドの最大文字数を適切な値に制限する
3. When 管理者が必須フィールドを空白のまま送信する, the Form Validation System shall フィールドごとに「入力必須です」というエラーメッセージを表示する
4. The Form Validation System shall 頭文字が1文字であることを検証する
5. The Form Validation System shall 頭文字の文字種に応じた頭文字の文字種（latin→A-Z、hiragana→ぁ-ん、katakana→ァ-ヶ）を検証する
6. The Form Validation System shall URLフィールドがURLの形式であることを検証する
7. The Form Validation System shall 日付フィールドがISO 8601形式（YYYY-MM-DD）であることを検証する
8. The Form Validation System shall クライアント側（フロントエンド）とサーバー側（API）の両方でバリデーションを実行する
9. If サーバー側バリデーションでエラーが発生した場合, then the API shall HTTPステータス400とエラー詳細をJSON形式で返す

### Requirement 9: UI/UX要件
**Objective:** 管理者として、既存の管理画面と一貫性のあるインターフェースを通じて効率的に作業したい

#### Acceptance Criteria
1. The Admin UI shall daisyUIコンポーネントを使用して既存管理画面と一貫性のあるデザインを提供する
2. The Admin UI shall レスポンシブデザインを実装し、デスクトップとタブレットで使用可能にする
3. When データの読み込み中, the Admin UI shall ローディングインジケーターを表示する
4. When API操作が成功した場合, the Admin UI shall トーストメッセージで成功通知を表示する
5. When API操作が失敗した場合, the Admin UI shall トーストメッセージでエラー通知を表示する
6. The Admin UI shall 削除操作の前に確認ダイアログを表示する
7. The Admin UI shall アーティスト管理、アーティスト別名義管理、サークル管理を管理者ヘッダーのナビゲーションに追加する
8. The Admin UI shall フォーム送信後に一覧画面にリダイレクトする

### Requirement 10: 認証とアクセス制御
**Objective:** システムとして、認証済み管理者のみがアーティスト・サークル管理機能にアクセスできるようにすることで、データのセキュリティを確保したい

#### Acceptance Criteria
1. The API Server shall すべてのエンドポイントで認証済み管理者のみアクセスを許可する
2. If 認証されていないリクエストの場合, then the API Server shall HTTPステータス401を返す
3. If 存在しないリソースへのリクエストの場合, then the API Server shall HTTPステータス404を返す
4. If 一意性制約違反の場合, then the API Server shall HTTPステータス409を返す
5. The Frontend shall 未認証ユーザーがアクセスした場合にログイン画面にリダイレクトする

### Requirement 11: パフォーマンスとスケーラビリティ
**Objective:** システムとして、大量のデータでも快適に動作することで、将来の成長に対応したい

#### Acceptance Criteria
1. The Database Layer shall 名前カラムと頭文字カラムにインデックスを作成する
2. The API Server shall 一覧エンドポイントでページネーションを実装し、デフォルトで20件ずつ返す
3. The API Server shall クエリパラメータlimitの最大値を100に制限する
4. When 検索クエリが実行される, the Database Layer shall LIKE句を使用した部分一致検索を実行する
5. The Frontend shall TanStack Queryを使用してAPIレスポンスをキャッシュする
6. The Frontend shall 一覧画面でページネーションコンポーネントを実装する

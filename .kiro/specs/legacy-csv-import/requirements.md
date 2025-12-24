# Requirements Document

## Introduction

旧東方編曲録システムで使用していたCSVファイルを、現行の管理システムにインポートする機能を提供する。CSVには東方アレンジ楽曲のメタデータ（サークル、アルバム、トラック、アーティスト、原曲情報）が含まれており、これらを既存のデータベーススキーマに変換・登録する。

インポート処理は3ステップのウィザード形式で行い、特に原曲のマッピングについてはユーザーが手動で確認・選択できるようにする。

## Requirements

### Requirement 1: CSVファイルアップロードとパース
**Objective:** As a 管理者, I want レガシーCSVファイルをアップロードしてプレビュー表示したい, so that インポート前にデータ内容を確認できる

#### Acceptance Criteria
1. When 管理者がCSVファイルを選択してアップロードする, the インポートサービス shall CSVをパースしてレコード一覧をプレビュー表示する
2. When CSVに重複ヘッダー行が含まれている, the CSVパーサー shall 重複ヘッダー行を自動的にスキップしてデータ行のみを抽出する
3. When CSVのartists列またはoriginal_songs列にコロン区切りの複数値が含まれている, the CSVパーサー shall 各値を分割して個別のエンティティとして処理する
4. When CSVのcircle列に「×」区切りの複合サークル名が含まれている, the CSVパーサー shall 各サークル名を分割して個別に登録する
5. If アップロードされたファイルがCSV形式でない, then the インポートサービス shall エラーメッセージを表示してアップロードを拒否する
6. If CSVのパースに失敗した（不正な形式）, then the インポートサービス shall 具体的なエラー内容を表示する

### Requirement 2: 原曲マッピング
**Objective:** As a 管理者, I want CSV内の原曲名を既存の公式楽曲データベースと照合したい, so that 正確なメタデータ紐付けができる

#### Acceptance Criteria
1. When 原曲名が公式楽曲データベースと完全一致する, the インポートサービス shall 自動的にマッピングを確定する
2. When 原曲名が公式楽曲データベースと部分一致する, the インポートサービス shall 類似度順に候補リストを表示してユーザーに選択を促す
3. When 原曲名が「オリジナル」である, the インポートサービス shall 既存の「オリジナル」レコードに自動的に紐付ける
4. If 原曲名にマッチする公式楽曲が見つからない, then the インポートサービス shall 手動選択またはスキップのオプションを提供する
5. The 原曲マッピングUI shall 未マッピングの原曲数とマッピング済みの原曲数を表示する
6. When ユーザーが原曲マッピングを完了して次へ進む, the インポートサービス shall マッピング結果を保持してインポート実行に使用する

### Requirement 3: イベント・サークル・アーティスト登録
**Objective:** As a 管理者, I want CSVからイベント、サークル、アーティスト情報を一括登録したい, so that 関連エンティティが自動的に作成される

#### Acceptance Criteria
1. When 新規イベント名がCSVに含まれている, the インポートサービス shall eventsテーブルに新規レコードを作成する
2. When イベント名が既存のeventSeriesの名前パターンと一致する, the インポートサービス shall 該当eventSeriesを紐付ける
3. If イベント名にマッチするeventSeriesが存在しない, then the インポートサービス shall eventSeriesId を null として登録する
4. When 新規サークル名がCSVに含まれている, the インポートサービス shall circlesテーブルに新規レコードを作成する
5. When 既存のサークル名がCSVに含まれている, the インポートサービス shall 既存レコードを使用して重複作成しない
6. When 複合サークル（「×」区切り）がCSVに含まれている, the インポートサービス shall 各サークルを個別に登録し、releaseCirclesで複数紐付けする
7. When 新規アーティスト名がCSVのvocalists/arrangers/lyricists列に含まれている, the インポートサービス shall artistsテーブルに新規レコードを作成する

### Requirement 4: リリース・トラック登録
**Objective:** As a 管理者, I want CSVからアルバムとトラック情報を一括登録したい, so that 楽曲データが正しく階層構造で保存される

#### Acceptance Criteria
1. When 新規アルバム名がCSVに含まれている, the インポートサービス shall releasesテーブルに新規レコードを作成する
2. When リリースが複合サークルに属している, the インポートサービス shall releaseCirclesテーブルに各サークルへの紐付けを作成する（positionを設定）
3. When 新規トラックがCSVに含まれている, the インポートサービス shall tracksテーブルに新規レコードを作成する
4. The インポートサービス shall トラックのtrack_number列の値をtracksテーブルのtrackNumber列に設定する
5. When 同一リリース内に同じtrackNumberのトラックが既存する, the インポートサービス shall 既存レコードを更新する

### Requirement 5: クレジット・原曲紐付け登録
**Objective:** As a 管理者, I want トラックのクレジット情報と原曲紐付けを一括登録したい, so that アーティストの役割と原曲情報が正しく記録される

#### Acceptance Criteria
1. When CSVのvocalists列にアーティスト名が含まれている, the インポートサービス shall trackCreditsとtrackCreditRolesにvocalistロールで登録する
2. When CSVのarrangers列にアーティスト名が含まれている, the インポートサービス shall trackCreditsとtrackCreditRolesにarrangerロールで登録する
3. When CSVのlyricists列にアーティスト名が含まれている, the インポートサービス shall trackCreditsとtrackCreditRolesにlyricistロールで登録する
4. When 原曲マッピングが完了している, the インポートサービス shall trackOfficialSongsテーブルに紐付けを作成する
5. When 1トラックに複数の原曲がある, the インポートサービス shall すべての原曲への紐付けを作成する

### Requirement 6: インポート結果表示
**Objective:** As a 管理者, I want インポート処理の結果を確認したい, so that 登録されたデータ件数とエラーを把握できる

#### Acceptance Criteria
1. When インポート処理が完了した, the インポートサービス shall 各エンティティの作成件数と更新件数を表示する
2. When インポート処理中にエラーが発生した, the インポートサービス shall エラー内容とエラーが発生したレコードを表示する
3. The インポート結果画面 shall 処理サマリーとして総レコード数、成功数、エラー数を表示する
4. If 一部のレコードでエラーが発生した場合, then the インポートサービス shall エラーのないレコードは正常に登録する（部分的成功を許容）
5. The インポート結果画面 shall インポート完了後に関連する管理画面へのリンクを提供する

### Requirement 7: データ整合性とトランザクション
**Objective:** As a システム, I want データ整合性を維持したい, so that 不完全なデータがデータベースに残らない

#### Acceptance Criteria
1. The インポートサービス shall 依存関係順（events → circles → artists → releases → tracks → credits）でデータを登録する
2. The インポートサービス shall 同一インポートセッション内の処理をトランザクションで管理する
3. If 致命的なエラーが発生した, then the インポートサービス shall トランザクションをロールバックして部分的なデータ登録を防ぐ
4. The インポートサービス shall 外部キー制約を遵守して参照整合性を維持する

### Requirement 8: UIとナビゲーション
**Objective:** As a 管理者, I want インポート機能に簡単にアクセスしたい, so that 効率的にデータ管理ができる

#### Acceptance Criteria
1. The 管理画面 shall サイドバーに「インポート」セクションを表示する
2. The インポートUI shall 3ステップウィザード形式（アップロード → 原曲マッピング → 結果）で構成される
3. While インポート処理中, the インポートUI shall ローディング状態を表示してユーザー操作を制限する
4. The インポートUI shall 各ステップで「戻る」「次へ」ボタンを提供する
5. The インポートUI shall 管理画面デザインガイドラインに準拠したUIを提供する

### Requirement 9: スキーマ変更
**Objective:** As a システム, I want eventSeriesを任意関連にしたい, so that eventSeriesが不明なイベントも登録できる

#### Acceptance Criteria
1. The eventsテーブル shall eventSeriesIdカラムをnullable（任意）として定義する
2. When eventSeriesIdがnullのイベントを作成する, the データベース shall 正常にレコードを保存する
3. The 既存のイベントデータ shall スキーマ変更後も正常に動作する

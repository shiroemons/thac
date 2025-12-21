# Requirements Document

## Introduction

本ドキュメントは、トラックおよびリリースに紐づく各種メタデータ・関連情報の管理機能に関する要件を定義する。東方アレンジ楽曲のメタデータ管理において、原曲との紐付け、派生関係、公開リンク、識別コード（JAN/ISRC）、テンポ情報などを体系的に管理できるようにする。

## Requirements

### Requirement 1: 原曲紐付け管理（Track-Official Song Relations）

**Objective:** As a 管理者, I want トラックと公式楽曲（原曲）の関連を管理したい, so that どの原曲をアレンジしたかを正確に記録・検索できる

#### Acceptance Criteria

1. When 管理者がトラック詳細画面で原曲を追加する, the システム shall 公式楽曲を検索・選択して紐付けを作成する
2. When 1つのトラックに複数の原曲がある場合, the システム shall part_positionで順序を管理する
3. Where 原曲の使用区間を特定できる場合, the システム shall 開始秒・終了秒を記録できる
4. Where 原曲紐付けの確度が不明確な場合, the システム shall confidence（0-100）を記録できる
5. The システム shall トラックID×公式楽曲ID×順序の組み合わせで一意性を保証する
6. If 紐付けられた公式楽曲を削除しようとした場合, the システム shall 削除を制限する（RESTRICT）

### Requirement 2: トラック派生関係管理（Track Derivations）

**Objective:** As a 管理者, I want トラック間の派生関係（リミックス・アレンジ・カバー等）を管理したい, so that 楽曲の系譜を追跡できる

#### Acceptance Criteria

1. When 管理者がトラック詳細画面で派生元トラックを指定する, the システム shall 親子関係を作成する
2. The システム shall 自己参照（child = parent）を禁止する
3. The システム shall 同一の派生関係の重複登録を禁止する
4. When 派生元トラックを削除しようとした場合, the システム shall 削除を制限する（RESTRICT）
5. When 派生先トラックを削除した場合, the システム shall 関連する派生関係も削除する（CASCADE）
6. Where 派生関係に補足情報がある場合, the システム shall notes（備考）を記録できる

### Requirement 3: リリース公開リンク管理（Release Publications）

**Objective:** As a 管理者, I want リリース全体の公開・配信リンクを管理したい, so that アルバム単位の配信情報を一元管理できる

#### Acceptance Criteria

1. When 管理者がリリース詳細画面で公開リンクを追加する, the システム shall プラットフォーム・URL・プラットフォーム内IDを記録する
2. The システム shall リリースID×プラットフォームID×プラットフォーム内IDの組み合わせで一意性を保証する
3. The システム shall 同一リリース内でURLの重複を禁止する
4. Where 公開状態を管理する場合, the システム shall visibility（public/unlisted/private等）を記録できる
5. Where 公開・取り下げ日時を記録する場合, the システム shall published_at・removed_atを記録できる
6. The システム shall 公式アップロードかどうか（is_official）を記録できる
7. Where 国別配信を管理する場合, the システム shall ISO 3166-1 alpha-2形式の国コードを記録できる

### Requirement 4: トラック公開リンク管理（Track Publications）

**Objective:** As a 管理者, I want トラック単位の公開・配信リンクを管理したい, so that 単曲動画や単曲配信の情報を管理できる

#### Acceptance Criteria

1. When 管理者がトラック詳細画面で公開リンクを追加する, the システム shall プラットフォーム・URL・プラットフォーム内IDを記録する
2. The システム shall トラックID×プラットフォームID×プラットフォーム内IDの組み合わせで一意性を保証する
3. The システム shall 同一トラック内でURLの重複を禁止する
4. Where 公開状態を管理する場合, the システム shall visibility（public/unlisted/private等）を記録できる
5. Where 公開・取り下げ日時を記録する場合, the システム shall published_at・removed_atを記録できる
6. The システム shall 公式アップロードかどうか（is_official）を記録できる

### Requirement 5: リリースJANコード管理（Release JAN Codes）

**Objective:** As a 管理者, I want リリースのJANコード（バーコード）を管理したい, so that 商品識別情報を記録・検索できる

#### Acceptance Criteria

1. When 管理者がリリース詳細画面でJANコードを追加する, the システム shall 8桁または13桁のJANコードを記録する
2. If 無効な形式のJANコードが入力された場合, the システム shall エラーメッセージを表示する
3. The システム shall JANコードの重複を禁止する（グローバル一意）
4. The システム shall 1リリースにつき主コード（is_primary）を1件のみ許可する
5. Where 発番レーベル情報がある場合, the システム shall labelを記録できる
6. Where 該当国を記録する場合, the システム shall ISO 3166-1 alpha-2形式の国コードを記録できる

### Requirement 6: トラックISRC管理（Track ISRCs）

**Objective:** As a 管理者, I want トラックのISRC（国際標準レコーディングコード）を管理したい, so that 楽曲の国際的な識別情報を記録・検索できる

#### Acceptance Criteria

1. When 管理者がトラック詳細画面でISRCを追加する, the システム shall 12桁のISRCを記録する
2. If 無効な形式のISRCが入力された場合, the システム shall エラーメッセージを表示する
3. The システム shall トラックID×ISRCの組み合わせで一意性を保証する
4. The システム shall 1トラックにつき主ISRC（is_primary）を1件のみ許可する
5. Where 付番日を記録する場合, the システム shall assigned_atを記録できる
6. Where 取得元情報がある場合, the システム shall sourceを記録できる

### Requirement 7: トラックテンポ管理（Track Tempos）

**Objective:** As a 管理者, I want トラックのテンポ情報を管理したい, so that BPMや拍子の変化を詳細に記録できる

#### Acceptance Criteria

1. When 管理者がトラック詳細画面でテンポ情報を追加する, the システム shall 位置（マイクロ秒）とBPMを記録する
2. The システム shall BPMを0より大きく400未満の範囲で検証する
3. The システム shall 位置（at_microsecond）を0以上で検証する
4. The システム shall トラックID×位置×BPMの組み合わせで一意性を保証する
5. Where 拍位置を記録する場合, the システム shall at_beatを記録できる
6. Where 拍子を記録する場合, the システム shall 分子（time_sig_numer）と分母（time_sig_denom）を記録できる
7. Where 算出方法を記録する場合, the システム shall source（manual/analyzed/imported等）を記録できる
8. Where 確度を記録する場合, the システム shall confidence（0-100）を記録できる

### Requirement 8: データベーススキーマ（SQLite変換）

**Objective:** As a 開発者, I want PostgreSQLスキーマをSQLiteベストプラクティスに変換したい, so that 既存のDrizzle ORM環境で動作する

#### Acceptance Criteria

1. The システム shall UUIDの代わりにnanoidベースのプレフィックス付きIDを使用する
2. The システム shall timestamptzの代わりにinteger（timestamp_ms）を使用する
3. The システム shall numericの代わりにreal型を使用する
4. The システム shall PostgreSQL固有の正規表現チェックをアプリケーションレベルのバリデーションに移行する
5. The システム shall 条件付きユニークインデックスをSQLiteのwhere句付きインデックスで実装する
6. The システム shall 既存のplatformsテーブル（codeベース）を参照する形式に変換する


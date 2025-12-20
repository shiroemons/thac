# Requirements Document

## Introduction

本仕様は、音楽カタログシステムにおけるトラック（楽曲）管理機能を定義する。トラックはリリースに紐づき、オプションでディスクにも紐づく。単曲公開の場合はディスクなしで管理可能。アーティストクレジット（盤面表記と本人の対応付け）、複数役割の付与、並び順管理などの機能を含む。

## データモデル概要

### テーブル構成
- **tracks**: トラック本体（リリース必須、ディスク任意）
- **track_credits**: クレジット情報（盤面表記とアーティスト/別名義の対応）
- **track_credit_roles**: クレジットに対する役割（多対多）

### 主要な設計方針
- `disc_id`はNULL許容（単曲公開対応）
- トラック番号はディスク有無で異なる一意制約を適用
- クレジットは「盤面表記」と「実際のアーティスト/別名義」を分離して管理
- 1つのクレジットに複数の役割を付与可能

## Requirements

### Requirement 1: トラック基本情報管理

**Objective:** As a 管理者, I want リリース内のトラック情報を登録・編集・削除, so that 作品に含まれる楽曲を正確に管理できる

#### Acceptance Criteria
1. When 管理者がトラック追加ボタンをクリック, the Track Management System shall トラック登録フォームを表示する
2. When 管理者がトラック情報を入力して保存, the Track Management System shall トラック名、トラック番号を含むトラックレコードを作成する
3. When 管理者がトラックを編集, the Track Management System shall 既存のトラック情報を更新する
4. When 管理者がトラックを削除, the Track Management System shall 確認ダイアログを表示し、確認後にトラックを削除する
5. If トラック名（name）が空の状態で保存を試みた場合, the Track Management System shall バリデーションエラーを表示する
6. The Track Management System shall トラック名（name: 必須）、日本語名（name_ja: 任意）、英語名（name_en: 任意）、トラック番号（track_number: 1以上の整数）を保存する
7. The Track Management System shall ディスクを指定しない単曲登録を許可する（disc_id = NULL）

### Requirement 2: トラックとディスクの関連管理

**Objective:** As a 管理者, I want トラックをディスクに紐づけるか単曲として管理するかを選択, so that CDアルバム形式と配信シングル形式の両方に対応できる

#### Acceptance Criteria
1. When 管理者がディスク付きでトラックを登録, the Track Management System shall 指定されたディスクにトラックを関連付ける
2. When 管理者がディスクなしでトラックを登録, the Track Management System shall disc_idをNULLとしてリリース直下にトラックを登録する
3. While disc_idがNULLの場合, the Track Management System shall 同一リリース内でトラック番号の一意性を保証する
4. While disc_idが指定されている場合, the Track Management System shall 同一ディスク内でトラック番号の一意性を保証する
5. If 重複するトラック番号で保存を試みた場合, the Track Management System shall 一意制約違反のエラーを表示する

### Requirement 3: トラック並び順管理

**Objective:** As a 管理者, I want ディスク（またはリリース直下）内のトラック順序を変更, so that 正しい曲順でトラックリストを表示できる

#### Acceptance Criteria
1. When 管理者がトラックの上へ移動ボタンをクリック, the Track Management System shall 対象トラックを1つ上の位置に移動する
2. When 管理者がトラックの下へ移動ボタンをクリック, the Track Management System shall 対象トラックを1つ下の位置に移動する
3. While トラックが最上位に位置している場合, the Track Management System shall 上へ移動ボタンを無効化する
4. While トラックが最下位に位置している場合, the Track Management System shall 下へ移動ボタンを無効化する
5. When トラックの順序が変更された場合, the Track Management System shall 関連するトラックのトラック番号を自動的に再採番する

### Requirement 4: トラッククレジット管理

**Objective:** As a 管理者, I want トラックごとに盤面表記とアーティストの対応を登録, so that 楽曲の制作者情報を正確に記録できる

#### Acceptance Criteria
1. When 管理者がクレジット追加ボタンをクリック, the Track Management System shall クレジット登録フォームを表示する
2. When 管理者がクレジット情報を入力して保存, the Track Management System shall 盤面表記（credit_name）、アーティスト、表示順（credit_position）を含むクレジットレコードを作成する
3. The Track Management System shall 盤面表記（credit_name: 必須）、アーティスト（artist_id: 必須）、別名義（artist_alias_id: 任意）、別名義種別（alias_type_code: 任意）、表示順（credit_position: 任意）を保存する
4. When 管理者がクレジットを編集, the Track Management System shall 既存のクレジット情報を更新する
5. When 管理者がクレジットを削除, the Track Management System shall 確認後に対象のトラッククレジットと関連する役割を削除する
6. The Track Management System shall 同一トラックに対して同一アーティスト・同一別名義の重複登録を防止する
7. The Track Management System shall 1つのトラックに対して複数のクレジットを登録可能とする

### Requirement 5: クレジット役割管理

**Objective:** As a 管理者, I want クレジットに対して複数の役割を付与, so that 作曲・編曲・ボーカルなど複数の役割を持つ参加者を正確に記録できる

#### Acceptance Criteria
1. When 管理者がクレジットに役割を追加, the Track Management System shall 役割コード（role_code）と役割内表示順（role_position）を含む役割レコードを作成する
2. The Track Management System shall 1つのクレジットに対して複数の役割を登録可能とする
3. When 管理者が役割を削除, the Track Management System shall 対象の役割のみを削除する
4. The Track Management System shall 同一クレジットに対して同一役割・同一表示順の重複登録を防止する
5. The Track Management System shall マスターデータ（credit_roles）に登録された役割のみ選択可能とする

### Requirement 6: トラック一覧表示

**Objective:** As a 管理者, I want 作品詳細画面でトラック一覧を確認, so that 登録されている楽曲を把握できる

#### Acceptance Criteria
1. When 管理者が作品詳細画面を開く, the Track Management System shall ディスクごとにグループ化されたトラック一覧を表示する
2. The Track Management System shall ディスクなしトラック（単曲）は別セクションとして表示する
3. The Track Management System shall 各トラックのトラック番号、トラック名を一覧で表示する
4. The Track Management System shall 各トラックのクレジット情報を要約表示する（クレジット数またはクレジット名一覧）
5. While ディスクにトラックが登録されていない場合, the Track Management System shall 「トラックがありません」のメッセージを表示する

### Requirement 7: データ整合性

**Objective:** As a システム, I want データの整合性を維持, so that 不正なデータが登録されることを防ぐ

#### Acceptance Criteria
1. When リリースが削除された場合, the Track Management System shall 関連するトラックとそのクレジット・役割を自動的に削除する（CASCADE）
2. When ディスクが削除された場合, the Track Management System shall 関連するトラックとそのクレジット・役割を自動的に削除する（CASCADE）
3. When アーティストを削除しようとした場合, the Track Management System shall クレジットが存在する場合は削除を拒否する（RESTRICT）
4. When 別名義が削除された場合, the Track Management System shall クレジットのartist_alias_idをNULLに設定する（SET NULL）
5. The Track Management System shall トラック番号は1以上の正の整数のみ許可する
6. The Track Management System shall クレジット表示順は1以上の正の整数またはNULLを許可する


## Project Description (Input)
トラック管理

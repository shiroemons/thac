# Requirements Document

## Introduction

東方Project関連コンテンツ管理システムのマスタデータ管理機能。プラットフォーム、アーティスト別名義種別、クレジット役割、公式作品カテゴリの4種類のマスタデータを管理する。PostgreSQL DDLをSQLite/Drizzle ORMに変換し、管理者向けCRUD操作と一括インポート機能を提供する。

## Project Description (Input)

マスタデータ管理

### 対象マスタテーブル

| テーブル名 | 説明 | 主キー |
|-----------|------|--------|
| platforms | 公開/配信/販売プラットフォーム | code (text) |
| alias_types | アーティスト別名義種別 | code (text) |
| credit_roles | トラッククレジット役割 | code (text) |
| official_work_categories | 公式作品カテゴリ | code (text) |

## Requirements

### Requirement 1: データベーススキーマ定義

**Objective:** As a 開発者, I want PostgreSQL DDLをSQLite/Drizzle ORMスキーマに変換したい, so that 型安全なデータアクセスが可能になる

#### Acceptance Criteria

1. The Database Package shall define `platforms` table with columns: code (text, primary key), name (text), category (text, nullable), url_pattern (text, nullable), created_at (integer, timestamp_ms), updated_at (integer, timestamp_ms)
2. The Database Package shall define `alias_types` table with columns: code (text, primary key), label (text), description (text, nullable) without timestamps
3. The Database Package shall define `credit_roles` table with columns: code (text, primary key), label (text), description (text, nullable) without timestamps
4. The Database Package shall define `official_work_categories` table with columns: code (text, primary key), name (text), description (text, nullable) without timestamps
5. The Database Package shall export Zod schemas for runtime validation of each master table
6. The Database Package shall include initial migration that inserts default `alias_types` values: 'romanization' (ローマ字表記) and 'pseudonym' (別名義)
7. The Database Package shall include initial migration that inserts default `official_work_categories` values: pc98, windows, zun_collection, akyus_untouched_score, commercial_book, tasofro, other

### Requirement 2: マスタデータ管理API

**Objective:** As a 管理者, I want 各マスタデータのCRUD操作をAPIで行いたい, so that フロントエンドから統一的にデータ管理ができる

#### Acceptance Criteria

1. The API Server shall expose RESTful endpoints under `/api/admin/master/` namespace for all master tables
2. When a GET request is made to `/api/admin/master/platforms`, the API Server shall return a paginated list of platforms with optional filtering by category
3. When a GET request is made to `/api/admin/master/platforms/:id`, the API Server shall return the platform details
4. When a POST request is made to `/api/admin/master/platforms` with valid data, the API Server shall create a new platform and return the created record
5. When a PUT request is made to `/api/admin/master/platforms/:id` with valid data, the API Server shall update the platform and return the updated record
6. When a DELETE request is made to `/api/admin/master/platforms/:id`, the API Server shall soft-delete or hard-delete the platform based on configuration
7. The API Server shall provide identical CRUD endpoints for alias_types, credit_roles, and official_work_categories tables
8. If validation fails for any request, the API Server shall return 400 status with detailed error messages
9. If the requested resource is not found, the API Server shall return 404 status

### Requirement 3: 管理者認証・認可

**Objective:** As a システム, I want マスタデータ管理APIを管理者のみに制限したい, so that 不正なデータ変更を防止できる

#### Acceptance Criteria

1. The API Server shall require authentication for all `/api/admin/master/*` endpoints
2. When an unauthenticated request is made to admin endpoints, the API Server shall return 401 status
3. When an authenticated but non-admin user accesses admin endpoints, the API Server shall return 403 status
4. The Auth Package shall provide middleware to verify admin role from session
5. While a user session is valid, the API Server shall allow access to admin endpoints if the user has admin role

### Requirement 4: 一括インポート機能

**Objective:** As a 管理者, I want CSVまたはJSONファイルから一括でマスタデータを登録したい, so that 初期データ投入や大量更新を効率的に行える

#### Acceptance Criteria

1. When a POST request is made to `/api/admin/master/:table/import` with CSV file, the API Server shall parse and validate all rows before insertion
2. When a POST request is made to `/api/admin/master/:table/import` with JSON file, the API Server shall parse and validate all records before insertion
3. If any row fails validation during import, the API Server shall reject the entire import and return detailed error information for each failed row
4. When import succeeds, the API Server shall return summary with count of created and updated records
5. The API Server shall support upsert mode for import (update existing records by primary key, insert new ones)
6. While import is processing, the API Server shall use database transaction to ensure atomicity

### Requirement 5: 管理画面UI

**Objective:** As a 管理者, I want Webブラウザからマスタデータを管理したい, so that 技術知識なしでデータ管理ができる

#### Acceptance Criteria

1. The Web App shall provide admin dashboard page at `/admin` route
2. The Web App shall display navigation menu for each master table type
3. When admin navigates to a master table section, the Web App shall display data in a sortable and filterable table
4. When admin clicks "新規作成" button, the Web App shall display a form with validation for creating new record
5. When admin clicks "編集" button on a row, the Web App shall display a pre-filled form for editing
6. When admin clicks "削除" button on a row, the Web App shall show confirmation dialog before deletion
7. When admin selects "インポート" action, the Web App shall display file upload interface accepting CSV or JSON
8. If API returns error, the Web App shall display user-friendly error message with details
9. While data is loading or saving, the Web App shall display loading indicator

### Requirement 6: データ整合性とバリデーション

**Objective:** As a システム, I want マスタデータの整合性を保証したい, so that 不正なデータによるシステム障害を防止できる

#### Acceptance Criteria

1. The Database Package shall enforce primary key constraint on `code` column for all master tables
2. The Database Package shall enforce NOT NULL constraint on required columns (code, name/label)
3. When creating a platform with duplicate code, the API Server shall return 409 conflict status
4. If url_pattern is provided for platform, the API Server shall validate it as valid regular expression
5. The API Server shall trim whitespace from text inputs before validation
6. The API Server shall reject empty string values for required fields


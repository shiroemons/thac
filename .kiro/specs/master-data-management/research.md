# Research & Design Decisions

## Summary
- **Feature**: master-data-management
- **Discovery Scope**: Extension（既存システムへのCRUD機能追加）
- **Key Findings**:
  - Better-Auth admin pluginが設定済みで、ロールベースアクセス制御が利用可能
  - Drizzle ORMスキーマパターンが確立されており、新規テーブル追加は容易
  - 管理画面レイアウト（`_admin.tsx`）が存在し、ロール検証ロジックが実装済み

## Research Log

### 既存データベーススキーマパターン
- **Context**: 新規マスタテーブルのスキーマ設計方針の決定
- **Sources Consulted**: `packages/db/src/schema/auth.ts`
- **Findings**:
  - タイムスタンプは`integer("...", { mode: "timestamp_ms" })`
  - デフォルト値: `sql`(cast(unixepoch('subsecond') * 1000 as integer))`
  - `$onUpdate`でupdated_at自動更新
  - インデックスは第3引数のコールバックで定義
- **Implications**: 新規マスタテーブルはcodeを主キーとして使用（全テーブル統一）、タイムスタンプは同じパターンに従う

### 既存認証・認可パターン
- **Context**: 管理者専用APIのアクセス制御方針
- **Sources Consulted**: `packages/auth/src/index.ts`, `apps/web/src/routes/admin/_admin.tsx`
- **Findings**:
  - Better-Auth admin plugin設定済み: `adminRoles: ["admin"]`
  - フロントエンドで`user.role !== "admin"`チェック実装済み
  - バックエンドでは`auth.handler`がセッション管理
  - nanoidでID生成（`advanced.database.generateId`）
- **Implications**: APIミドルウェアでセッション検証とロールチェックが必要

### 既存Honoサーバー構成
- **Context**: API拡張ポイントの特定
- **Sources Consulted**: `apps/server/src/index.ts`
- **Findings**:
  - シンプルな構成: logger, CORS, auth routes
  - 現在のCORS allowMethods: GET, POST, OPTIONS
  - `/api/auth/*`パスでBetter-Auth handler接続
- **Implications**: `/api/admin/master/*`ルートを追加、CORSにPUT/DELETEメソッド追加が必要

### 既存フロントエンドルーティング
- **Context**: 管理画面UI拡張ポイントの特定
- **Sources Consulted**: `apps/web/src/routes/admin/`
- **Findings**:
  - `_admin.tsx`レイアウトでロール検証済み
  - 未認証→`/admin/login`リダイレクト
  - 非管理者→403ページ表示
  - shadcn/uiコンポーネント利用可能（button, card, input等）
- **Implications**: `/admin/_admin/master/`配下にルート追加、既存レイアウト活用

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Modular Routes | 各マスタテーブルごとにルートファイル分離 | 責務が明確、保守性高い | ファイル数増加 | 採用：Honoのルートグルーピング活用 |
| Single Route | 1ファイルで全マスタテーブル処理 | ファイル数削減 | 肥大化リスク | 不採用 |
| Generic CRUD | 汎用CRUD関数でテーブル名パラメータ化 | コード再利用性 | 型安全性が複雑化 | 部分採用：共通ユーティリティのみ |

## Design Decisions

### Decision: スキーマ配置
- **Context**: 4つのマスタテーブルスキーマの配置場所
- **Alternatives Considered**:
  1. `packages/db/src/schema/master.ts`に全テーブル定義
  2. 各テーブルを個別ファイルに分離
- **Selected Approach**: `packages/db/src/schema/master.ts`に全テーブル定義
- **Rationale**: マスタテーブルは関連性が高く、1ファイルで管理が容易。auth.tsパターンに準拠
- **Trade-offs**: ファイルサイズは大きくなるが、関連テーブル間の参照が容易
- **Follow-up**: テーブル数が増えた場合は分割を検討

### Decision: APIルート構成
- **Context**: CRUD APIのルート設計
- **Alternatives Considered**:
  1. `/api/admin/master/:table/:id`（動的テーブル名）
  2. `/api/admin/master/platforms/:id`等（テーブル別固定パス）
- **Selected Approach**: テーブル別固定パス
- **Rationale**: 型安全性を維持しやすく、各テーブル固有のバリデーションが容易
- **Trade-offs**: 類似コードが増えるが、Honoルートグルーピングで軽減
- **Follow-up**: 共通ミドルウェアで認証・エラーハンドリングを統一

### Decision: フロントエンドステート管理
- **Context**: マスタデータ一覧・編集画面のデータ管理
- **Alternatives Considered**:
  1. TanStack Query（サーバー状態管理）
  2. ローカルstate + fetch
- **Selected Approach**: TanStack Query
- **Rationale**: 既存プロジェクトで採用済み、キャッシュ・再フェッチが自動化
- **Trade-offs**: 学習コストがあるが、既存パターンに従うため問題なし
- **Follow-up**: mutationでの楽観的更新は初期実装では見送り

## Risks & Mitigations
- **Risk 1**: CORSでPUT/DELETEが未許可 → allowMethodsに追加必要
- **Risk 2**: 初期データマイグレーションの実行タイミング → db:migrateで自動実行されるよう構成
- **Risk 3**: インポート機能でのファイルサイズ制限 → Honoのbody limit設定確認が必要

## References
- [Drizzle ORM SQLite Documentation](https://orm.drizzle.team/docs/get-started/sqlite-new)
- [Hono Routing](https://hono.dev/docs/api/routing)
- [Better-Auth Admin Plugin](https://www.better-auth.com/docs/plugins/admin)
- [TanStack Query](https://tanstack.com/query/latest)

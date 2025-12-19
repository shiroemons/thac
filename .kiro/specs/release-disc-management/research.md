# Research & Design Decisions

## Summary
- **Feature**: `release-disc-management`
- **Discovery Scope**: Extension（既存システムへの機能追加）
- **Key Findings**:
  - 既存のイベント管理（events/eventDays）パターンをリリース/ディスク管理に適用可能
  - Drizzle ORM + SQLiteのスキーマパターンは`event.ts`を踏襲
  - 管理画面UIは`events.tsx`のネスト管理パターンを再利用

## Research Log

### 既存スキーマパターン分析
- **Context**: リリース/ディスクスキーマの設計指針を確立
- **Sources Consulted**: `packages/db/src/schema/event.ts`, `artist-circle.ts`
- **Findings**:
  - ID: `text("id").primaryKey()` + nanoid生成
  - タイムスタンプ: `integer("created_at", { mode: "timestamp_ms" })`
  - 日付: `text("date")` でYYYY-MM-DD形式
  - 外部キー: `.references(() => table.id, { onDelete: "cascade" })`
  - インデックス: `index("idx_table_column").on(table.column)`
  - ユニーク制約: `uniqueIndex("uq_table_columns").on(table.col1, table.col2)`
- **Implications**: リリース/ディスクスキーマは既存パターンに完全準拠

### API設計パターン分析
- **Context**: リリース/ディスクAPIの設計指針を確立
- **Sources Consulted**: `apps/server/src/routes/admin/events/events.ts`, `event-days.ts`
- **Findings**:
  - ネストされたリソース（eventDays）はイベントIDをパラメータに含む
  - Zodスキーマによるバリデーション（`insertSchema.safeParse`）
  - エラーハンドリング: 404（Not found）、409（Conflict）、400（Validation）
  - 一覧取得: ページネーション + 検索 + フィルタ対応
  - 詳細取得: 関連エンティティ（days）を含めて返却
- **Implications**: `/admin/releases/:releaseId/discs`のネストパターンを採用

### 管理画面UIパターン分析
- **Context**: リリース管理画面のUI設計指針を確立
- **Sources Consulted**: `apps/web/src/routes/admin/_admin/events.tsx`
- **Findings**:
  - `useColumnVisibility`フックによるカラム表示切り替え
  - `DataTableActionBar`による検索・フィルタ・新規作成
  - `DataTablePagination`によるページネーション
  - 編集ダイアログ内でネストエンティティ（開催日）を管理
  - TanStack Queryによるデータフェッチとキャッシュ無効化
- **Implications**: `events.tsx`のコンポーネント構造をリリース管理に適用

### サイドバーナビゲーション分析
- **Context**: リリース管理へのナビゲーション追加方法
- **Sources Consulted**: `apps/web/src/components/admin-sidebar.tsx`
- **Findings**:
  - `navItems`配列にNavGroupまたはNavItemを追加
  - lucide-reactアイコンを使用（`Disc`アイコンが利用可能）
  - グループ化により関連機能をまとめて表示
- **Implications**: 新規「リリース管理」グループを追加

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存パターン踏襲 | events管理と同一のアーキテクチャ | 一貫性、学習コスト低 | 特になし | 採用 |
| 独立モジュール | リリース専用のモジュール構成 | 分離度高 | 不要な複雑性 | 不採用 |

## Design Decisions

### Decision: スキーマ配置
- **Context**: releases, discs, releaseCirclesテーブルの配置場所
- **Alternatives Considered**:
  1. `release.ts` + `release.validation.ts`を新規作成
  2. 既存の`artist-circle.ts`に追加
- **Selected Approach**: Option 1 - 新規ファイルとして分離
- **Rationale**: 関心の分離、保守性向上
- **Trade-offs**: ファイル数増加（許容範囲）
- **Follow-up**: `schema/index.ts`へのエクスポート追加

### Decision: APIルーティング構造
- **Context**: リリースとディスクのエンドポイント設計
- **Alternatives Considered**:
  1. `/admin/releases` + `/admin/releases/:id/discs`（ネスト）
  2. `/admin/releases` + `/admin/discs`（フラット）
- **Selected Approach**: Option 1 - ネスト構造
- **Rationale**: 親子関係が明確、イベント管理と一貫性
- **Trade-offs**: URL長くなる（許容範囲）
- **Follow-up**: ディスクAPIはリリースID存在チェックを実施

### Decision: UI実装方式
- **Context**: リリース管理画面の実装方式
- **Alternatives Considered**:
  1. 単一ページ（events.tsx方式）
  2. 詳細ページを分離（別ルート）
- **Selected Approach**: Option 1 - 単一ページ
- **Rationale**: 既存パターンとの一貫性、UX向上
- **Trade-offs**: 単一ファイルが大きくなる可能性
- **Follow-up**: コンポーネント分割を必要に応じて検討

## Risks & Mitigations
- **Risk 1**: releaseCirclesテーブルは今回のスコープ外 → スキーマ定義のみ、UI実装は後続フェーズ
- **Risk 2**: ディスク番号の重複チェック → ユニーク制約 + API側での409エラー
- **Risk 3**: eventDayIdとの外部キー整合性 → SET NULL on deleteで対応済み

## References
- [Drizzle ORM SQLite Documentation](https://orm.drizzle.team/docs/get-started-sqlite)
- [TanStack Query v5 Documentation](https://tanstack.com/query/latest)
- [Hono Web Framework](https://hono.dev/)

# Research & Design Decisions

## Summary
- **Feature**: official-works-songs-management
- **Discovery Scope**: Extension（既存マスタ管理パターンの拡張）
- **Key Findings**:
  - 既存のマスタ管理CRUD実装パターンが明確に確立されている
  - TSVインポート機能は既存のCSV/JSONパーサーを拡張して対応可能
  - SQLite外部キー制約とDrizzle ORMの統合パターンが確認済み

## Research Log

### 既存マスタ管理パターンの分析
- **Context**: 新機能が既存パターンに準拠する必要性
- **Sources Consulted**:
  - `packages/db/src/schema/master.ts` - スキーマ定義パターン
  - `packages/db/src/schema/master.validation.ts` - Zodバリデーションパターン
  - `apps/server/src/routes/admin/master/platforms.ts` - CRUD APIパターン
  - `apps/web/src/routes/admin/_admin/master/platforms.tsx` - UI実装パターン
- **Findings**:
  - スキーマ: `text`型主キー、`integer("timestamp_ms")`でタイムスタンプ管理
  - バリデーション: `createInsertSchema`/`createSelectSchema`でDrizzle連携
  - API: Honoルーター、ページネーション、検索、フィルタの標準パターン
  - UI: TanStack Query + DataTable系コンポーネントの組み合わせ
- **Implications**: 新テーブルも同一パターンで実装し一貫性を維持

### TSVインポート機能の実装方針
- **Context**: 初期データ投入にTSV形式を使用したい要件
- **Sources Consulted**:
  - `apps/server/src/utils/import-parser.ts` - 既存パーサー実装
- **Findings**:
  - 既存パーサーはCSV（カンマ区切り）とJSONをサポート
  - TSV対応は区切り文字をタブに変更するだけで実現可能
  - `parseAndValidate`関数の拡張で対応
- **Implications**: 既存パーサーにTSVサポートを追加（破壊的変更なし）

### SQLite外部キー制約の実装
- **Context**: official_songsからofficial_worksへの外部キー、自己参照
- **Sources Consulted**:
  - Drizzle ORM公式ドキュメント
  - 既存スキーマ（`officialWorkCategories`との参照パターン）
- **Findings**:
  - SQLiteでは`references()`でFK定義可能
  - CASCADE削除は`onDelete: 'cascade'`で指定
  - 自己参照FKは同テーブル内で`references(() => table.id)`
- **Implications**: Drizzleの標準API使用でFK制約を実装

### ナビゲーション構造の拡張
- **Context**: 「公式管理」を「マスタ管理」とは別グループで表示
- **Sources Consulted**:
  - `apps/web/src/components/admin-sidebar.tsx`
- **Findings**:
  - `NavGroup`型で折りたたみ可能なグループを定義
  - `navItems`配列に新グループを追加するだけで対応可能
  - アイコンはLucide Reactから選択（Music, Discなど）
- **Implications**: サイドバーへの追加は最小限の変更で実現

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存パターン踏襲 | マスタ管理と同一構造でofficial/配下に配置 | 一貫性、学習コスト低、コード再利用 | 特になし | 採用 |
| 独立パッケージ化 | official関連を別パッケージに分離 | 完全な分離 | オーバーエンジニアリング | 見送り |

## Design Decisions

### Decision: スキーマファイルの分離
- **Context**: マスタテーブルとは異なるドメインのテーブル
- **Alternatives Considered**:
  1. `master.ts`に追加 — 既存ファイルに追記
  2. `official.ts`として分離 — 新ファイルを作成
- **Selected Approach**: `official.ts`として分離
- **Rationale**: ドメインの明確な分離、ファイルサイズの管理、将来の拡張性
- **Trade-offs**: ファイル数は増えるが、責務が明確になる
- **Follow-up**: `index.ts`でのエクスポート追加を忘れないこと

### Decision: APIルートの構造
- **Context**: `/api/admin/master/`と並列で新しいエンドポイントを配置
- **Alternatives Considered**:
  1. `/api/admin/master/official-works` — マスタ配下
  2. `/api/admin/official/works` — 独立パス
- **Selected Approach**: `/api/admin/official/works`および`/songs`
- **Rationale**: マスタデータとトランザクションデータの意味的分離
- **Trade-offs**: ルート構造がやや複雑になるが、ドメイン境界が明確
- **Follow-up**: `adminRouter`に`officialRouter`をマウント

### Decision: TSVパーサーの実装方式
- **Context**: 既存CSVパーサーとの統合
- **Alternatives Considered**:
  1. 既存`import-parser.ts`を拡張 — TSV検出を追加
  2. 別ファイルとして実装 — `tsv-parser.ts`を新規作成
- **Selected Approach**: 既存パーサーを拡張
- **Rationale**: コード重複回避、一貫した検証ロジック
- **Trade-offs**: 既存ファイルの変更が必要
- **Follow-up**: `.tsv`ファイル拡張子の検出ロジック追加

## Risks & Mitigations
- **外部キー制約による削除エラー** — CASCADE削除の設定とUI上の警告表示
- **大量データインポート時のパフォーマンス** — トランザクション内でバッチ処理
- **自己参照FKの循環参照** — アプリケーションレベルでのバリデーション（sourceSongId ≠ id）

## References
- [Drizzle ORM - Foreign Keys](https://orm.drizzle.team/docs/sql-schema-declaration#foreign-keys) — FK定義の公式ドキュメント
- [Hono - Routing](https://hono.dev/api/routing) — ルーティングパターン
- [TanStack Query](https://tanstack.com/query/latest) — データフェッチングパターン

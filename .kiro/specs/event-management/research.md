# Research & Design Decisions

## Summary
- **Feature**: event-management
- **Discovery Scope**: Extension（既存パターンを新ドメインに適用）
- **Key Findings**:
  - `circles` + `circleLinks` パターンが `events` + `eventDays` に直接適用可能
  - SQLite では日付型がないため `text` 型（YYYY-MM-DD 形式）で保持
  - イベントシリーズはイベント作成画面でインライン作成可能（Select + 新規作成）

## Research Log

### 既存パターン調査
- **Context**: イベント管理の実装パターンを既存コードから特定
- **Sources Consulted**:
  - `packages/db/src/schema/artist-circle.ts`
  - `apps/server/src/routes/admin/circles/index.ts`
  - `apps/web/src/routes/admin/_admin/circles.tsx`
  - `apps/web/src/lib/api-client.ts`
- **Findings**:
  - ID: `text("id").primaryKey()` + nanoid
  - タイムスタンプ: `integer("...", { mode: "timestamp_ms" })`
  - 外部キー: `onDelete: "cascade"` または `"restrict"`
  - バリデーション: `drizzle-zod` + カスタム Zod スキーマ
  - 子エンティティ管理: 親の編集ダイアログ内でインライン管理
- **Implications**: 既存パターンをそのまま踏襲することで実装リスクを最小化

### 日付型の扱い
- **Context**: PostgreSQL の `date` 型を SQLite に変換する方法
- **Sources Consulted**: Drizzle ORM ドキュメント、既存スキーマ
- **Findings**:
  - SQLite には `date` 型がない
  - `text` 型で YYYY-MM-DD 形式の文字列として保持
  - バリデーションは Zod で ISO 8601 形式をチェック
- **Implications**: フロントエンドの日付入力は `<input type="date">` を使用

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| circles パターン踏襲 | 親子エンティティを同一ダイアログで管理 | 実績あり、一貫性 | なし | 採用 |
| 別ページで開催日管理 | 開催日を別画面で管理 | 単純化 | UX 低下、ナビゲーション増加 | 却下 |

## Design Decisions

### Decision: イベントシリーズのインライン作成
- **Context**: イベント作成時にシリーズも同時に作成したい
- **Alternatives Considered**:
  1. 事前にシリーズを別画面で作成 — 操作が煩雑
  2. シリーズ選択＋新規作成ボタン — 1画面で完結
- **Selected Approach**: Select コンポーネントに新規作成機能を追加
- **Rationale**: UX 向上、既存の platforms 選択パターンと類似
- **Trade-offs**: UI がやや複雑化するが許容範囲
- **Follow-up**: シリーズ名の重複チェックをフロントエンドでも実施

### Decision: 開催日の管理方式
- **Context**: イベント開催日をどこで管理するか
- **Alternatives Considered**:
  1. 別画面で管理 — ナビゲーションが増える
  2. イベント編集ダイアログ内でインライン管理 — circleLinks と同様
- **Selected Approach**: イベント編集ダイアログ内でインライン管理
- **Rationale**: circleLinks パターンの実績、UX の一貫性
- **Trade-offs**: ダイアログが縦長になる可能性
- **Follow-up**: 開催日が多い場合はスクロール可能な領域を設ける

## Risks & Mitigations
- **リスク1**: 開催日数が多い場合のUI — スクロール可能領域で対応
- **リスク2**: シリーズ削除時の制約 — RESTRICT 制約でイベント紐付き時は削除不可

## References
- Drizzle ORM SQLite ドキュメント
- 既存実装: `packages/db/src/schema/artist-circle.ts`
- 既存実装: `apps/web/src/routes/admin/_admin/circles.tsx`

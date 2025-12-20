# Research & Design Decisions: Track Management

---
**Purpose**: トラック管理機能の技術設計に必要な調査結果と設計判断を記録する。
**Usage**: design.mdの根拠となる技術調査とトレードオフ分析を保持。
---

## Summary
- **Feature**: `track-management`
- **Discovery Scope**: Extension（既存リリース管理システムへの機能拡張）
- **Key Findings**:
  - Drizzle ORMの部分インデックス（WHERE句）は[既知の問題](https://github.com/drizzle-team/drizzle-orm/issues/3349)があり、`sql`テンプレートリテラルでの回避が必要
  - 既存のdiscs、releaseCirclesパターンがtracks実装のテンプレートとして活用可能
  - ネストしたリソース構造（track → credit → role）は既存APIパターンで対応可能

## Research Log

### SQLite部分インデックス（WHERE句付きUNIQUE INDEX）
- **Context**: 要件2.3/2.4でdisc_id有無による条件付き一意制約が必要
- **Sources Consulted**:
  - [Drizzle ORM Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints)
  - [GitHub Issue #3349](https://github.com/drizzle-team/drizzle-orm/issues/3349)
- **Findings**:
  - Drizzle ORMのマイグレーション生成でWHERE句のパラメータが正しく展開されない問題あり
  - 回避策: `sql`テンプレートリテラルを使用（`sql\`${table.discId} IS NULL\``）
  - 手動マイグレーション編集または`inlineParams()`メソッドも選択肢
- **Implications**:
  - スキーマ定義時に`sql`テンプレートを使用
  - マイグレーション生成後の手動確認が必要

### 複合外部キー制約（disc_id, release_id）
- **Context**: PostgreSQL設計では`FOREIGN KEY (disc_id, release_id) REFERENCES discs(id, release_id)`
- **Sources Consulted**: 既存コードベース分析
- **Findings**:
  - SQLite/Drizzleでは複合外部キーの直接サポートが限定的
  - 既存パターン: discs.releaseIdへの単一FK + アプリケーション層での整合性チェック
- **Implications**:
  - disc_idへの単一FK + APIでのrelease_id一致検証で対応
  - トランザクション内での整合性保証

### 既存パターン分析
- **Context**: 拡張機能として既存パターンとの整合性確認
- **Sources Consulted**: discs.ts, release-circles.ts, releases_.$id.tsx
- **Findings**:
  - ID生成: フロントエンドでnanoid生成
  - タイムスタンプ: `integer("created_at", { mode: "timestamp_ms" })`
  - バリデーション: drizzle-zod + カスタムZod
  - 並び順更新: position swap（2レコード同時更新）
- **Implications**: 既存パターン踏襲で実装可能

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Hybrid Approach | スキーマ分離 + API統合 + UI段階的分離 | 関心分離、既存パターン整合 | UIファイルサイズ増加 | **採用** |
| Full Extension | 全て既存ファイルに追加 | 最小ファイル数 | ファイル肥大化 | release.ts 250行超の懸念 |
| Full Separation | 全て新規ファイル | 完全分離 | 既存パターン逸脱 | TanStack Router設計変更必要 |

## Design Decisions

### Decision: 部分インデックスの実装方法
- **Context**: disc_id有無で異なる一意制約が必要（要件2.3, 2.4）
- **Alternatives Considered**:
  1. Drizzle標準のuniqueIndex + where → マイグレーション生成問題
  2. sqlテンプレートによる回避 → 動作確認済み
  3. アプリケーション層のみで制約 → DB整合性リスク
- **Selected Approach**: sqlテンプレート + 手動マイグレーション確認
- **Rationale**: DB層での制約維持、既知の回避策適用
- **Trade-offs**: マイグレーション生成後の確認工程追加
- **Follow-up**: マイグレーション実行後のインデックス確認

### Decision: APIエンドポイント構造
- **Context**: tracks、credits、rolesの3階層リソース
- **Alternatives Considered**:
  1. ネスト構造 `/releases/:id/tracks/:trackId/credits/:creditId/roles`
  2. フラット構造 `/tracks/:id`, `/track-credits/:id`, `/track-credit-roles/:id`
- **Selected Approach**: ネスト構造（リリース配下）
- **Rationale**: 既存discs、releaseCirclesパターンとの整合性
- **Trade-offs**: URLが長くなるが、リソース階層が明確
- **Follow-up**: なし

### Decision: クレジット・役割のUI設計
- **Context**: クレジットに複数役割を付与するUI
- **Alternatives Considered**:
  1. 役割を別モーダルで管理
  2. クレジット編集時に役割も同時編集
  3. インライン編集（テーブル行内）
- **Selected Approach**: クレジット編集ダイアログ内で役割をチェックボックス選択
- **Rationale**: 1画面で完結、操作ステップ削減
- **Trade-offs**: ダイアログが複雑化するが、既存パターン範囲内
- **Follow-up**: 役割数が多い場合のUI検証

## Risks & Mitigations
- **部分インデックスのマイグレーション生成失敗** → 手動確認プロセスをタスクに含める
- **ネストCRUDのクエリ複雑化** → TanStack Queryのネストクエリ最適化
- **UIファイルサイズ増加** → TrackManagementコンポーネント抽出（Phase 2）

## References
- [Drizzle ORM Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints) — インデックス定義構文
- [GitHub Issue #3349](https://github.com/drizzle-team/drizzle-orm/issues/3349) — 部分インデックス問題と回避策
- 既存コード: `packages/db/src/schema/release.ts` — discsパターン
- 既存コード: `apps/server/src/routes/admin/releases/release-circles.ts` — position管理パターン

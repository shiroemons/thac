# Research & Design Decisions: public-links

---
**Purpose**: 公式作品・公式楽曲への公開リンク機能の設計調査と決定事項を記録。

---

## Summary
- **Feature**: `public-links`
- **Discovery Scope**: Extension（既存circleLinksパターンの拡張適用）
- **Key Findings**:
  - circleLinksテーブル・APIが完全なリファレンス実装として存在
  - platforms マスタテーブルがURLパターンバリデーション機能を提供
  - 既存の詳細画面（works_.$id.tsx, songs_.$id.tsx）にカード追加で対応可能

## Research Log

### circleLinksパターンの分析
- **Context**: 類似機能の既存実装を調査し、踏襲すべきパターンを特定
- **Sources Consulted**:
  - `packages/db/src/schema/artist-circle.ts:106-137`
  - `apps/server/src/routes/admin/circles/index.ts:229-475`
  - `packages/db/src/schema/artist-circle.validation.ts:214-232`
- **Findings**:
  - スキーマ: id, 親ID, platformCode, url, 各種フラグ, timestamps
  - API: ネストルート形式（GET/POST /:parentId/links, PUT/DELETE /:parentId/links/:linkId）
  - バリデーション: Zod + drizzle-zod、URLパターン検証
- **Implications**:
  - 同じパターンで officialWorkLinks, officialSongLinks を実装可能
  - 不要なフィールド（isOfficial, isPrimary, handle, platformId）を除外し簡素化

### 表示順序管理の調査
- **Context**: リンクの表示順序をどのように管理するか
- **Sources Consulted**:
  - `packages/db/src/schema/master.ts` - platforms.sortOrder
  - `.kiro/steering/admin.md` - 並べ替えUIガイドライン
- **Findings**:
  - マスタテーブルでは sortOrder + ReorderButtons パターンが確立
  - circleLinks では isPrimary でソートしているが、単純な順序管理には sortOrder が適切
- **Implications**:
  - sortOrder カラムを追加し、ReorderButtons コンポーネントで順序変更

### ID生成規則の確認
- **Context**: 新規リンクテーブルのID生成プレフィックスを決定
- **Sources Consulted**:
  - `packages/db/src/utils/id.ts`
  - `.kiro/steering/admin.md` - ID生成ルール
- **Findings**:
  - 形式: `{prefix}_{nanoid()}` で21文字英数字
  - 命名規則: 1単語は先頭2文字、複合語は各語頭文字
- **Implications**:
  - officialWorkLink → `wl_` (work link)
  - officialSongLink → `sl_` (song link)

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: 既存ファイル拡張 | official.ts, works.ts, songs.ts に追加 | ファイル数最小 | ファイル肥大化 | 保守性低下リスク |
| B: 完全分離 | 新規 official-links.ts, work-links.ts 等 | 責務明確 | ファイル増加、重複リスク | 過剰分離 |
| **C: ハイブリッド** | スキーマは official.ts、APIは新規ファイル | ドメイン凝集と保守性のバランス | 若干複雑 | **採用** |

## Design Decisions

### Decision: ハイブリッドアプローチの採用
- **Context**: スキーマ、API、UIの配置をどう構成するか
- **Alternatives Considered**:
  1. 既存ファイルにすべて追加 — 簡単だがファイル肥大化
  2. 完全に新規ファイルに分離 — 責務明確だが過剰分離
- **Selected Approach**: スキーマは official.ts に追加、APIは新規ファイルに分離
- **Rationale**: スキーマはドメイン的にofficialに属するため統合が自然。APIは複雑なため分離で保守性向上
- **Trade-offs**:
  - ✅ ドメイン凝集とファイル保守性のバランス
  - ✅ 既存パターンとの一貫性
  - ❌ 設計がやや複雑

### Decision: sortOrderによる順序管理
- **Context**: isPrimary vs sortOrder のどちらで順序を管理するか
- **Alternatives Considered**:
  1. isPrimary — circleLinks と同じ（プライマリ1件のみ上位）
  2. sortOrder — マスタテーブルと同じ（任意の順序指定）
- **Selected Approach**: sortOrder を採用
- **Rationale**: 複数のリンクに優先順位をつけたい場合、sortOrder の方が柔軟
- **Trade-offs**:
  - ✅ 柔軟な順序指定が可能
  - ✅ ReorderButtons との親和性
  - ❌ isPrimary の「主要リンク」概念は失われる

### Decision: 簡素化されたスキーマ
- **Context**: circleLinks のどのフィールドを踏襲するか
- **Selected Approach**:
  - 採用: id, 親ID, platformCode, url, sortOrder, createdAt, updatedAt
  - 除外: platformId, handle, isOfficial, isPrimary
- **Rationale**: 公式作品・楽曲のリンクは「公式」が前提のため isOfficial 不要。handle/platformId は URL から推測可能で冗長
- **Trade-offs**:
  - ✅ シンプルなスキーマ
  - ❌ 将来的に追加フィールドが必要になる可能性

## Risks & Mitigations
- **スキーマ変更リスク** — 新規テーブル追加のみで既存テーブルへの影響なし（Low）
- **API複雑性** — circleLinks パターンを踏襲することで学習コスト軽減（Low）
- **UI一貫性** — 既存の管理画面ガイドラインに準拠（Low）

## References
- [Drizzle ORM Documentation](https://orm.drizzle.team/) — スキーマ定義とリレーション
- [Hono Documentation](https://hono.dev/) — APIルーティング
- [Zod Documentation](https://zod.dev/) — バリデーションスキーマ

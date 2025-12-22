# Research & Design Decisions

## Summary
- **Feature**: track-relations
- **Discovery Scope**: Extension（既存システムへの新テーブル・コンポーネント追加）
- **Key Findings**:
  - 既存パターンの完全な踏襲が可能（Drizzle ORM、Hono API、TanStack Query）
  - 6つの新テーブルは3つのスキーマファイルに分割して管理（テンポ管理は除外）
  - platforms テーブルはUUIDではなくcode主キー形式のため参照方法に注意が必要

## Research Log

### 既存スキーマパターンの調査

- **Context**: 新規テーブル設計にあたり、既存のDrizzle ORMスキーマパターンを確認
- **Sources Consulted**:
  - `packages/db/src/schema/track.ts` - tracks, trackCredits, trackCreditRoles定義
  - `packages/db/src/schema/release.ts` - releases, discs, releaseCircles定義
  - `packages/db/src/utils/id.ts` - ID生成ユーティリティ
- **Findings**:
  - ID形式: `{prefix}_{21文字英数字}` (nanoid使用)
  - タイムスタンプ: `integer("column", { mode: "timestamp_ms" })`
  - 条件付きユニークインデックス: `.where(sql\`...\`)` で実装
  - 外部キー: onDeleteにCASCADE/RESTRICT/SET NULLを適切に使い分け
- **Implications**: 新テーブルはすべてこのパターンに従う

### ID生成プレフィックスの設計

- **Context**: 新規7テーブルのIDプレフィックスを決定
- **Sources Consulted**:
  - `.kiro/steering/admin.md` - ID生成ルール
  - `packages/db/src/utils/id.ts` - 既存プレフィックス一覧
- **Findings**:
  - 命名規則: 1単語は最初の2文字、複合語は各単語の頭文字
  - 既存: `ar_`, `ci_`, `tr_`, `tc_`, `re_`, `di_`, `ev_`, `es_`, `ed_`, `aa_`, `cl_`
- **Implications**: 新規プレフィックスは以下を採用
  - trackOfficialSongs → `to_` (track-official)
  - trackDerivations → `td_` (track-derivation)
  - releasePublications → `rp_` (release-publication)
  - trackPublications → `tp_` (track-publication)
  - releaseJanCodes → `rj_` (release-jan)
  - trackIsrcs → `ti_` (track-isrc)

### platforms テーブル参照方式の調査

- **Context**: publications テーブルがplatformsを参照する際の方式を確認
- **Sources Consulted**: `packages/db/src/schema/master.ts`
- **Findings**:
  - platforms テーブルは `code` カラムが主キー（UUIDではない）
  - 他のマスターテーブル（aliasTypes, creditRoles, officialWorkCategories）も同様
- **Implications**:
  - publications テーブルは `platformCode text` で参照
  - 外部キー制約: `.references(() => platforms.code)`

### API設計パターンの調査

- **Context**: 新規CRUDエンドポイントの設計パターンを確認
- **Sources Consulted**:
  - `apps/server/src/routes/admin/releases/tracks.ts`
  - `apps/server/src/routes/admin/releases/track-credits.ts`
- **Findings**:
  - ネストリソースパターン: `/releases/:releaseId/tracks/:trackId`
  - 親リソース存在チェック必須
  - Zodバリデーション + safeParse
  - エラーレスポンス: `{ error: "message" }` + 適切なステータスコード
- **Implications**:
  - トラック関連: `/tracks/:trackId/official-songs`, `/tracks/:trackId/isrcs` 等
  - リリース関連: `/releases/:releaseId/publications`, `/releases/:releaseId/jan-codes` 等

### UI設計パターンの調査

- **Context**: トラック・リリース詳細画面への新セクション追加方式を確認
- **Sources Consulted**: `apps/web/src/routes/admin/_admin/tracks_.$id.tsx`
- **Findings**:
  - 詳細画面は複数セクション（カード）で構成
  - 関連データはネストテーブルで表示
  - Dialog形式のCRUDフォーム
  - SearchableSelect による関連エンティティ選択
  - ローディング/エラー状態の一貫した処理
- **Implications**:
  - 既存のクレジットセクションと同様のUI構造を適用
  - 各新機能は独立したカードセクションとして追加

### バリデーションパターンの調査

- **Context**: 正規表現チェックのSQLite対応方式を確認
- **Sources Consulted**:
  - `packages/db/src/schema/track.validation.ts`
  - PostgreSQL元スキーマ（ユーザー提供）
- **Findings**:
  - SQLite は REGEX CHECK 制約をネイティブサポートしない
  - 既存は `drizzle-zod` + カスタムZodバリデーションで対応
- **Implications**:
  - JAN: `z.string().regex(/^[0-9]{8}$|^[0-9]{13}$/)`
  - ISRC: `z.string().regex(/^[A-Z]{2}[A-Z0-9]{3}[0-9]{2}[0-9]{5}$/)`
  - 国コード: `z.string().regex(/^[A-Z]{2}$/)`

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Option A: 既存ファイル拡張 | track.ts, release.ts に新テーブルを追加 | ファイル数が増えない | ファイル肥大化（300行超） | ❌ 非推奨 |
| Option B: 機能別ファイル分割 | 4つの新規スキーマファイルを作成 | 関心の分離、保守性向上 | インポートが分散 | ✅ 採用 |
| Option C: ドメイン別ファイル分割 | 2ファイル（track-metadata, release-metadata） | 中程度のバランス | ファイルが中程度に大きくなる | ⭕ 次善策 |

**採用**: Option B（機能別ファイル分割）

## Design Decisions

### Decision: スキーマファイル分割方針

- **Context**: 7つの新テーブルをどのように整理するか
- **Alternatives Considered**:
  1. 既存ファイルに追加 - シンプルだがファイル肥大化
  2. 機能別に4ファイル作成 - 関心の分離が明確
  3. ドメイン別に2ファイル作成 - 中間的なバランス
- **Selected Approach**: 機能別に3ファイル作成
  - `track-relations.ts` - trackOfficialSongs, trackDerivations
  - `publication.ts` - releasePublications, trackPublications
  - `identifier.ts` - releaseJanCodes, trackIsrcs
- **Rationale**:
  - 既存ファイルへの影響を最小化
  - 各ファイルが単一の責任を持つ
  - 将来の拡張にも対応しやすい
- **Trade-offs**: ファイル数は増えるが、保守性と可読性が向上
- **Follow-up**: schema/index.ts でエクスポートを追加

### Decision: 派生関係の表示形式

- **Context**: トラック間の派生関係をどのように表示するか
- **Alternatives Considered**:
  1. ツリー表示（階層構造を可視化）
  2. フラットリスト（シンプルなテーブル）
- **Selected Approach**: フラットリスト形式
- **Rationale**:
  - 初期実装としてシンプルに開始
  - 既存のクレジット表示と一貫したUI
  - 循環検出は初期スコープ外（シンプルな親子関係のみ）
- **Trade-offs**: 深い階層の可視化は将来の拡張で対応
- **Follow-up**: 必要に応じてツリー表示を追加検討

## Risks & Mitigations

- **Risk**: platformsテーブルのcode主キーが変更された場合、publicationsの参照が壊れる
  - **Mitigation**: platforms.codeは主キーのため変更されにくい。ON UPDATE CASCADEは不要。

- **Risk**: 派生関係の循環参照が発生する可能性
  - **Mitigation**: 初期実装では自己参照チェックのみ。深い循環検出は将来の拡張。

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/) - スキーマ定義、インデックス設計
- [nanoid](https://github.com/ai/nanoid) - ID生成ライブラリ
- [ISRC Handbook](https://isrc.ifpi.org/) - ISRC形式仕様
- [JAN/EAN規格](https://www.gs1jp.org/) - JANコード形式仕様

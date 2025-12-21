# Gap Analysis: track-relations

## 1. 現状調査（Current State Investigation）

### 1.1 関連ファイル・モジュール

| カテゴリ | ファイル | 説明 |
|---------|---------|------|
| **スキーマ** | `packages/db/src/schema/track.ts` | tracks, trackCredits, trackCreditRoles定義 |
| **スキーマ** | `packages/db/src/schema/release.ts` | releases, discs, releaseCircles定義 |
| **スキーマ** | `packages/db/src/schema/official.ts` | officialWorks, officialSongs定義 |
| **スキーマ** | `packages/db/src/schema/master.ts` | platforms, creditRoles等のマスター定義 |
| **ID生成** | `packages/db/src/utils/id.ts` | nanoidベースのプレフィックス付きID生成 |
| **バリデーション** | `packages/db/src/schema/track.validation.ts` | Zodスキーマ定義 |
| **API** | `apps/server/src/routes/admin/tracks/index.ts` | トラックAPI（単体取得のみ） |
| **API** | `apps/server/src/routes/admin/releases/tracks.ts` | リリース配下のトラックCRUD |
| **UI** | `apps/web/src/routes/admin/_admin/tracks_.$id.tsx` | トラック詳細画面 |
| **UI** | `apps/web/src/routes/admin/_admin/releases_.$id.tsx` | リリース詳細画面 |

### 1.2 既存パターン・規約

#### データベーススキーマ
- **ID形式**: `{prefix}_{21文字英数字}` (例: `tr_aBcD...`)
- **タイムスタンプ**: `integer("column", { mode: "timestamp_ms" })`
- **外部キー**: CASCADE/RESTRICT/SET NULL を適切に使い分け
- **条件付きユニーク**: `.where(sql\`...\`)` で実装

#### ID生成プレフィックス（既存）
| テーブル | プレフィックス |
|---------|---------------|
| artist | `ar_` |
| circle | `ci_` |
| track | `tr_` |
| trackCredit | `tc_` |
| release | `re_` |
| disc | `di_` |
| event | `ev_` |

#### バリデーション
- `drizzle-zod` による `createInsertSchema` / `createSelectSchema`
- 空文字拒否の `nonEmptyString` ヘルパー
- insert/update/select の3種類のスキーマを定義

#### API設計
- Honoルーター（`new Hono<AdminContext>()`）
- RESTfulエンドポイント（GET/POST/PUT/DELETE）
- ネストリソース: `/releases/:releaseId/tracks/:trackId`

#### UI設計
- TanStack Router + TanStack Query
- 詳細画面で関連データをネストテーブルで表示
- Dialog形式のCRUDフォーム
- `SearchableSelect` による関連エンティティ選択

### 1.3 統合ポイント

| 統合ポイント | 現状 | 備考 |
|-------------|------|------|
| `tracks` テーブル | 存在 | 新テーブルはここを参照 |
| `releases` テーブル | 存在 | publicationsが参照 |
| `officialSongs` テーブル | 存在 | 原曲紐付けの参照先 |
| `platforms` テーブル | 存在（code主キー） | publications.platformCode で参照 |
| トラック詳細画面 | 存在 | クレジットのみ表示中 |

---

## 2. 要件実現可能性分析

### 2.1 技術的ニーズ

| 要件 | データモデル | API | UI | バリデーション |
|------|-------------|-----|-----|--------------|
| Req1: 原曲紐付け | trackOfficialSongs | CRUD | トラック詳細に追加 | 秒数チェック |
| Req2: トラック派生 | trackDerivations | CRUD | トラック詳細に追加 | 自己参照チェック |
| Req3: リリース公開リンク | releasePublications | CRUD | リリース詳細に追加 | URL形式チェック |
| Req4: トラック公開リンク | trackPublications | CRUD | トラック詳細に追加 | URL形式チェック |
| Req5: JANコード | releaseJanCodes | CRUD | リリース詳細に追加 | 8/13桁チェック |
| Req6: ISRC | trackIsrcs | CRUD | トラック詳細に追加 | 12桁形式チェック |
| Req7: テンポ | trackTempos | CRUD | トラック詳細に追加 | BPM範囲チェック |
| Req8: SQLite変換 | 全テーブル | - | - | アプリ側で実装 |

### 2.2 ギャップ・制約

#### Missing（不足）

| 項目 | 説明 | 優先度 |
|------|------|-------|
| 新規テーブル7つ | trackOfficialSongs, trackDerivations, releasePublications, trackPublications, releaseJanCodes, trackIsrcs, trackTempos | 必須 |
| ID生成関数の追加 | 新テーブル用のプレフィックス追加（`to_`, `td_`, `rp_`, `tp_`, `rj_`, `ti_`, `tt_`） | 必須 |
| バリデーションスキーマ | 各テーブルのZodスキーマ | 必須 |
| APIルート | 各テーブルのCRUDエンドポイント | 必須 |
| UI: 関連セクション | トラック・リリース詳細画面への追加 | 必須 |

#### Constraint（制約）

| 項目 | 説明 | 対応方針 |
|------|------|---------|
| platforms.code参照 | 既存platformsはUUIDではなくcode主キー | スキーマをplatformCodeで参照 |
| SQLite制約 | REGEX CHECKがネイティブ非対応 | アプリ側Zodバリデーションで対応 |
| is_primary制約 | 条件付きユニーク必要 | `.where(sql\`...\`)` で実装 |

#### Research Needed（要調査）

| 項目 | 詳細 |
|------|------|
| テンポUI | マイクロ秒入力のUX設計（秒.ミリ秒入力→変換？） |
| 派生関係の循環検出 | 深い階層の循環参照をアプリで検証するか |

### 2.3 複雑度シグナル

- **CRUD中心**: 全要件がシンプルなCRUD操作
- **ワークフローなし**: 承認フローや状態遷移なし
- **外部連携なし**: 外部APIとの連携は不要
- **アルゴリズムなし**: 複雑なビジネスロジックなし

---

## 3. 実装アプローチオプション

### Option A: 既存ファイルの拡張

**適用箇所**: `track.ts` や `release.ts` に新テーブルを追加

**メリット**:
- ファイル数が増えない
- 関連テーブルが同一ファイルに集約

**デメリット**:
- `track.ts` が肥大化（現在122行→推定300行超）
- 責任範囲が曖昧に

**評価**: ❌ 非推奨（ファイルが大きくなりすぎる）

### Option B: 新規ファイル作成

**適用箇所**: 機能別に新規スキーマファイルを作成

```
packages/db/src/schema/
├── track-relations.ts      # trackOfficialSongs, trackDerivations
├── publication.ts          # releasePublications, trackPublications
├── identifier.ts           # releaseJanCodes, trackIsrcs
├── track-tempo.ts          # trackTempos
```

**メリット**:
- 関心の分離が明確
- 既存ファイルへの影響なし
- 個別にテスト可能

**デメリット**:
- ファイル数が増える
- インポートが分散

**評価**: ✅ 推奨

### Option C: ハイブリッド

**適用箇所**: 関連性の高いものをグループ化

```
packages/db/src/schema/
├── track-metadata.ts       # 全トラック関連（原曲, 派生, 公開リンク, ISRC, テンポ）
├── release-metadata.ts     # 全リリース関連（公開リンク, JAN）
```

**メリット**:
- ファイル数を抑えつつ既存への影響なし
- ドメイン単位で整理

**デメリット**:
- ファイルが中程度に大きくなる可能性

**評価**: ⭕ 次善策

---

## 4. 実装複雑度・リスク評価

### 工数見積もり: **L（1-2週間）**

| フェーズ | 内容 | 見積 |
|---------|------|-----|
| スキーマ設計・実装 | 7テーブル + バリデーション | 2日 |
| ID生成・マイグレーション | プレフィックス追加、db:push | 0.5日 |
| API実装 | 7エンティティ×CRUD | 3日 |
| UI実装 | トラック・リリース詳細画面拡張 | 4日 |
| テスト・調整 | 結合テスト、バリデーション調整 | 1.5日 |

### リスク評価: **Low（低）**

| 要因 | 評価 | 理由 |
|------|------|------|
| 技術的難易度 | 低 | 既存パターンの踏襲で対応可能 |
| アーキテクチャ変更 | なし | 既存構造に新テーブル追加のみ |
| 外部依存 | なし | すべて内部完結 |
| パフォーマンス | 低リスク | 単純なCRUD、N+1は適切なクエリ設計で回避 |

---

## 5. 推奨事項

### 推奨アプローチ: **Option B（新規ファイル作成）**

理由:
- 7つの新テーブルは既存ファイルに追加するには多すぎる
- 機能別に分離することで保守性向上
- 既存コードへの影響を最小化

### 設計フェーズでの決定事項

1. **ファイル分割方針**: 4ファイルに分割（track-relations, publication, identifier, track-tempo）
2. **IDプレフィックス**: 新規7種を確定
3. **platforms参照**: `platformCode` でcode主キーを参照

### 残課題（設計フェーズへ持ち越し）

| 項目 | 詳細 |
|------|------|
| テンポUIのUX | マイクロ秒入力方法の詳細設計 |
| 派生関係の表示 | ツリー表示 vs フラットリスト |
| 公開リンクのプラットフォーム選択UI | 既存platformsマスターとの連携方法 |

---

## 6. 要件-アセットマップ

| 要件 | 既存アセット | ギャップ |
|------|-------------|---------|
| Req1: 原曲紐付け | officialSongs存在 | Missing: trackOfficialSongsテーブル |
| Req2: トラック派生 | tracks存在 | Missing: trackDerivationsテーブル |
| Req3: リリース公開リンク | releases, platforms存在 | Missing: releasePublicationsテーブル |
| Req4: トラック公開リンク | tracks, platforms存在 | Missing: trackPublicationsテーブル |
| Req5: JANコード | releases存在 | Missing: releaseJanCodesテーブル |
| Req6: ISRC | tracks存在 | Missing: trackIsrcsテーブル |
| Req7: テンポ | tracks存在 | Missing: trackTemposテーブル |
| Req8: SQLite変換 | 既存パターン確立済み | Constraint: REGEX→Zodバリデーション |


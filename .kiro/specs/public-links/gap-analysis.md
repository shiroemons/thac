# ギャップ分析: public-links

## 概要

公式作品（OfficialWork）および公式楽曲（OfficialSong）に公開リンクを紐づける機能の実装ギャップ分析。

---

## 1. 現状調査

### 既存アセット

#### 類似パターン: circleLinks

`circleLinks` テーブルが既に存在し、サークルに外部リンクを紐づけるパターンが確立されている。

**スキーマ構成** (`packages/db/src/schema/artist-circle.ts:106-137`):
```typescript
export const circleLinks = sqliteTable("circle_links", {
  id: text("id").primaryKey(),
  circleId: text("circle_id").references(() => circles.id, { onDelete: "cascade" }),
  platformCode: text("platform_code").references(() => platforms.code),
  url: text("url").notNull(),
  platformId: text("platform_id"),      // 今回は不要
  handle: text("handle"),               // 今回は不要
  isOfficial: integer("is_official"),   // 今回は不要
  isPrimary: integer("is_primary"),     // sortOrderで代替
  createdAt, updatedAt
});
```

**API構成** (`apps/server/src/routes/admin/circles/index.ts:229-475`):
- `GET /:circleId/links` - リンク一覧取得
- `POST /:circleId/links` - リンク追加
- `PUT /:circleId/links/:linkId` - リンク更新
- `DELETE /:circleId/links/:linkId` - リンク削除

**バリデーション** (`packages/db/src/schema/artist-circle.validation.ts:214-232`):
- `insertCircleLinkSchema` - 作成時バリデーション
- `updateCircleLinkSchema` - 更新時バリデーション
- URL形式バリデーション、プラットフォームURLパターン検証

#### 対象エンティティ

**officialWorks** (`packages/db/src/schema/official.ts:13-45`):
- ID: text（例: `0201` 形式の4桁ID）
- 関連楽曲との1対多関係あり

**officialSongs** (`packages/db/src/schema/official.ts:48-79`):
- ID: text（例: `02010007` 形式の8桁ID）
- officialWorkIdで作品と紐づく

#### プラットフォームマスタ

**platforms** (`packages/db/src/schema/master.ts:4-24`):
- code: text (主キー)
- name, category, urlPattern, sortOrder
- `urlPattern` でURL形式のバリデーションが可能

#### 管理画面詳細ページ

- `apps/web/src/routes/admin/_admin/official/works_.$id.tsx` - 作品詳細（関連楽曲カードあり）
- `apps/web/src/routes/admin/_admin/official/songs_.$id.tsx` - 楽曲詳細（基本情報のみ）

### 抽出された規約

| カテゴリ | 規約 |
|---------|------|
| ID生成 | `packages/db/src/utils/id.ts` で `{prefix}_{nanoid()}` 形式 |
| スキーマ配置 | `packages/db/src/schema/{entity}.ts` + `{entity}.validation.ts` |
| APIルート | `apps/server/src/routes/admin/{entity}/index.ts` |
| バリデーション | Zod + drizzle-zod、insert/update/select スキーマ |
| 外部キー削除 | 親エンティティ削除時に CASCADE |

---

## 2. 要件実現性分析

### 技術的ニーズ

| 要件 | 必要な技術要素 | 現状 |
|------|---------------|------|
| Req 1-2: リンクCRUD | DBテーブル、API、バリデーション | **Missing** |
| Req 3: データモデル | officialWorkLinks, officialSongLinks テーブル | **Missing** |
| Req 4: プラットフォーム | platformsマスタ参照 | ✅ 既存 |
| Req 5: 表示順序 | sortOrder カラム、並べ替えAPI | パターンあり（マスタテーブル） |
| Req 6: API認証 | admin-authミドルウェア | ✅ 既存 |

### ギャップ一覧

| ギャップ | 種別 | 詳細 |
|---------|------|------|
| リンクテーブル未存在 | Missing | officialWorkLinks, officialSongLinks 新規作成必要 |
| バリデーションスキーマ未存在 | Missing | 新規Zodスキーマ作成必要 |
| API未存在 | Missing | /official/works/:id/links, /official/songs/:id/links 新規作成必要 |
| 管理画面UI未存在 | Missing | 詳細ページにリンク管理カード追加必要 |
| ID生成関数未存在 | Missing | createId.officialWorkLink, createId.officialSongLink 追加必要 |

### 複雑性シグナル

- **CRUD操作**: circleLinksパターンをほぼそのまま適用可能
- **外部連携**: なし（内部データのみ）
- **ワークフロー**: 単純なCRUD、承認フローなし

---

## 3. 実装アプローチ

### Option A: 既存コンポーネント拡張

**対象**: official.ts にリンクテーブルを追加、既存APIファイルを拡張

**変更ファイル**:
- `packages/db/src/schema/official.ts` - テーブル定義追加
- `packages/db/src/schema/official.validation.ts` - バリデーション追加
- `apps/server/src/routes/admin/official/works.ts` - リンクAPI追加
- `apps/server/src/routes/admin/official/songs.ts` - リンクAPI追加
- `apps/web/src/routes/admin/_admin/official/works_.$id.tsx` - UIカード追加
- `apps/web/src/routes/admin/_admin/official/songs_.$id.tsx` - UIカード追加

**トレードオフ**:
- ✅ ファイル数最小、既存構造に自然に統合
- ✅ 関連コードが集約され保守しやすい
- ❌ official関連ファイルが肥大化する可能性

### Option B: 新規コンポーネント作成

**対象**: 公開リンク専用のスキーマ・API・UIを分離

**新規ファイル**:
- `packages/db/src/schema/official-links.ts` - テーブル定義
- `packages/db/src/schema/official-links.validation.ts` - バリデーション
- `apps/server/src/routes/admin/official/work-links.ts` - 作品リンクAPI
- `apps/server/src/routes/admin/official/song-links.ts` - 楽曲リンクAPI
- `apps/web/src/components/admin/official-links-card.tsx` - 共有UIコンポーネント

**トレードオフ**:
- ✅ 責務が明確に分離
- ✅ 既存ファイルへの影響最小
- ❌ ファイル数増加、ナビゲーション複雑化
- ❌ 類似コードの重複可能性

### Option C: ハイブリッドアプローチ（推奨）

**対象**: スキーマはofficial.tsに追加、API・UIは分離

**変更・新規ファイル**:
- `packages/db/src/schema/official.ts` - テーブル定義追加（既存）
- `packages/db/src/schema/official.validation.ts` - バリデーション追加（既存）
- `packages/db/src/utils/id.ts` - ID生成関数追加（既存）
- `apps/server/src/routes/admin/official/work-links.ts` - 作品リンクAPI（新規）
- `apps/server/src/routes/admin/official/song-links.ts` - 楽曲リンクAPI（新規）
- `apps/web/src/components/admin/official-link-dialog.tsx` - 追加/編集ダイアログ（新規）
- `apps/web/src/routes/admin/_admin/official/works_.$id.tsx` - リンクカード追加（既存）
- `apps/web/src/routes/admin/_admin/official/songs_.$id.tsx` - リンクカード追加（既存）

**理由**:
- スキーマはドメイン的にofficialに属するため統合が自然
- APIは複雑なためファイル分離で保守性向上
- UIダイアログは再利用可能なコンポーネントとして分離

**トレードオフ**:
- ✅ ドメイン凝集とファイル保守性のバランス
- ✅ circleLinksパターンの踏襲で学習コスト低
- ❌ 計画が若干複雑

---

## 4. 工数・リスク評価

### 工数: S〜M（3〜5日）

**理由**:
- circleLinksパターンが完全に確立されており、ほぼコピー&調整で実装可能
- テーブル2つ、API4つ（各2エンドポイントセット）、UI2画面への追加
- 新規技術の習得不要

### リスク: Low

**理由**:
- 類似実装（circleLinks）が動作検証済み
- 外部APIやサービス連携なし
- パフォーマンス・セキュリティは既存パターン踏襲で対応可能
- スキーマ変更はあるが、新規テーブル追加のみで既存影響なし

---

## 5. 設計フェーズへの推奨事項

### 推奨アプローチ

**Option C（ハイブリッド）** を推奨

### 主要な設計決定事項

1. **テーブル設計**: circleLinksをベースに簡素化（isOfficial, isPrimary, handle, platformIdを除外、sortOrder追加）
2. **API設計**: ネストルート形式（/official/works/:id/links, /official/songs/:id/links）
3. **UI設計**: 詳細ページ内にカード形式でリンク一覧表示、ダイアログでCRUD

### 持ち越し調査項目

- なし（既存パターンで全て対応可能）

---

## 要件-アセットマップ

| 要件 | 既存アセット | ギャップ |
|------|-------------|---------|
| Req 1: 作品リンク管理 | - | Missing: テーブル、API、UI |
| Req 2: 楽曲リンク管理 | - | Missing: テーブル、API、UI |
| Req 3: データモデル | circleLinksパターン | Missing: 新規テーブル定義 |
| Req 4: プラットフォーム | platforms (✅) | - |
| Req 5: 表示順序 | sortOrderパターン (✅) | - |
| Req 6: API認証 | admin-auth (✅) | - |

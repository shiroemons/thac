# Gap Analysis: release-detail-circle-association

## 分析サマリー

本分析では、作品詳細画面とサークル関連付け機能の実装に必要なギャップを特定した。

- **データベース**: `release_circles`テーブルは既存。更新用スキーマが不足
- **API**: 作品-サークル関連付けエンドポイントが未実装（4エンドポイント必要）
- **フロントエンド**: 詳細画面ルート、サークル選択UIが未実装
- **推定工数**: M（3-7日）、リスク: Low

---

## 1. 現状調査

### 1.1 関連アセット

| カテゴリ | ファイル | 状況 |
|---------|---------|------|
| DBスキーマ | `packages/db/src/schema/release.ts` | `releases`, `discs`, `releaseCircles`テーブル定義済み |
| バリデーション | `packages/db/src/schema/release.validation.ts` | insert/selectスキーマあり、updateスキーマなし |
| サーバーAPI | `apps/server/src/routes/admin/releases/` | releases, discsのCRUD実装済み |
| フロントAPI | `apps/web/src/lib/api-client.ts` | `releasesApi`, `discsApi`, `circlesApi`定義済み |
| UI | `apps/web/src/routes/admin/_admin/releases.tsx` | 一覧画面のみ（詳細画面なし） |

### 1.2 既存パターン

**ネストされたリソースパターン（discs参照）**:
- API: `GET/POST /api/admin/releases/:releaseId/discs`
- API: `PUT/DELETE /api/admin/releases/:releaseId/discs/:discId`
- クライアント: `discsApi.list(releaseId)`, `discsApi.create(releaseId, data)`

**DBスキーマ（releaseCircles）**:
```typescript
// 現在のスキーマ（変更予定）
releaseCircles = sqliteTable("release_circles", {
  releaseId: text("release_id").notNull().references(() => releases.id),
  circleId: text("circle_id").notNull().references(() => circles.id),
  participationType: text("participation_type").notNull(), // role → participation_type に変更
  position: integer("position").default(1),
}, (table) => [
  primaryKey({ columns: [table.releaseId, table.circleId, table.participationType] }),
]);
```

### 1.3 統合ポイント

- **認証**: `AdminContext`ミドルウェア経由（既存パターン）
- **ルーティング**: TanStack Router（ファイルベース）
- **状態管理**: TanStack Query（既存パターン）
- **UIコンポーネント**: daisyUI + カスタムコンポーネント

---

## 2. 要件実現性分析

### 2.1 要件-アセットマッピング

| 要件 | 必要な技術要素 | 現状 | ギャップ |
|-----|--------------|------|---------|
| Req1: 詳細画面 | ルート、コンポーネント | 一覧画面のみ | **Missing**: 詳細画面ルート |
| Req2: ディスク管理 | API、UI | 既存（ダイアログ内） | 移植可能 |
| Req3: サークル関連 | DB、API、UI | DBスキーマのみ | **Missing**: API、UI |
| Req4: サークル選択 | 検索UI、ダイアログ | サークル一覧API既存 | **Missing**: 選択ダイアログ |
| Req5: 一覧→詳細導線 | Link追加 | なし | 軽微な変更 |
| Req6: API | REST エンドポイント | なし | **Missing**: 4エンドポイント |

### 2.2 ギャップ詳細

#### Missing: サーバーAPI

`apps/server/src/routes/admin/releases/circles.ts`（新規作成）

必要なエンドポイント:
- `GET /:releaseId/circles` - 関連サークル一覧取得
- `POST /:releaseId/circles` - サークル関連付け追加
- `PATCH /:releaseId/circles/:circleId` - participationType/position更新
- `DELETE /:releaseId/circles/:circleId` - 関連付け解除

#### Missing: バリデーションスキーマ

`packages/db/src/schema/release.validation.ts`に追加:
```typescript
export const updateReleaseCircleSchema = z.object({
  participationType: z.enum(PARTICIPATION_TYPES).optional(),
  position: z.number().int().min(1).optional(),
});
```

#### Missing: フロントエンドルート

`apps/web/src/routes/admin/_admin/releases/$id.tsx`（新規作成）

TanStack Routerの動的ルートパターンに従う。

#### Missing: フロントエンドAPIクライアント

`apps/web/src/lib/api-client.ts`に追加:
```typescript
export const releaseCirclesApi = {
  list: (releaseId: string) => ...,
  add: (releaseId: string, data: {...}) => ...,
  update: (releaseId: string, circleId: string, data: {...}) => ...,
  remove: (releaseId: string, circleId: string) => ...,
};
```

#### Missing: サークル選択UIコンポーネント

`apps/web/src/components/admin/circle-select-dialog.tsx`（新規作成）

既存の`circlesApi.list()`を使用した検索・選択ダイアログ。

### 2.3 複雑性シグナル

| 要素 | 複雑性 | 備考 |
|-----|-------|------|
| CRUD操作 | 低 | 既存パターン踏襲 |
| 検索UI | 低 | 既存の検索パターン流用 |
| 順序変更（position） | 中 | ドラッグ&ドロップまたはボタンUI |
| 複合主キー処理 | 低 | (releaseId, circleId, participationType) |

---

## 3. 実装アプローチオプション

### Option A: 既存コンポーネント拡張

**概要**: `releases.tsx`を拡張して詳細表示機能を追加

**対象ファイル**:
- `apps/web/src/routes/admin/_admin/releases.tsx`（拡張）
- `apps/server/src/routes/admin/releases/releases.ts`（拡張）

**トレードオフ**:
- ✅ ファイル数を増やさない
- ✅ 既存コードとの一貫性維持
- ❌ `releases.tsx`が肥大化（現在887行）
- ❌ 責務が混在する

**評価**: 推奨しない（既存ファイルが既に大きい）

### Option B: 新規コンポーネント作成

**概要**: 詳細画面を独立したルートとして作成

**対象ファイル（新規）**:
- `apps/web/src/routes/admin/_admin/releases/$id.tsx` - 詳細画面
- `apps/web/src/components/admin/circle-select-dialog.tsx` - サークル選択
- `apps/server/src/routes/admin/releases/circles.ts` - サークルAPI

**対象ファイル（変更）**:
- `apps/web/src/routes/admin/_admin/releases.tsx` - 詳細リンク追加
- `apps/web/src/lib/api-client.ts` - `releaseCirclesApi`追加
- `apps/server/src/routes/admin/releases/index.ts` - circlesルーター統合
- `packages/db/src/schema/release.validation.ts` - updateスキーマ追加

**トレードオフ**:
- ✅ 責務の明確な分離
- ✅ テスト容易性向上
- ✅ 既存パターン（discsRouter）との一貫性
- ❌ ファイル数増加

**評価**: **推奨**

### Option C: ハイブリッドアプローチ

**概要**: 基本機能を先に実装し、ドラッグ&ドロップは後続フェーズ

**フェーズ1**:
- 詳細画面（表示・編集）
- サークル追加・削除
- 順序変更（上下ボタン）

**フェーズ2**:
- ドラッグ&ドロップによる順序変更
- UIの洗練

**トレードオフ**:
- ✅ 早期にMVP提供可能
- ✅ リスク分散
- ❌ 2段階の実装が必要

**評価**: 複雑性を抑えたい場合に有効

---

## 4. 工数・リスク評価

### 工数: M（3-7日）

**根拠**:
- 既存パターン（discsRouter）の踏襲により新規設計が少ない
- DBスキーマ変更なし
- UI実装の大部分は既存コンポーネント流用可能

**内訳**:
- サーバーAPI実装: 0.5-1日
- フロントエンド詳細画面: 1-2日
- サークル選択UI: 0.5-1日
- 一覧画面修正: 0.5日
- テスト・統合: 1-2日

### リスク: Low

**根拠**:
- 既知の技術スタック内で完結
- 既存パターン（ディスク管理）を参考にできる
- アーキテクチャ変更なし
- 外部依存なし

---

## 5. 設計フェーズへの推奨事項

### 推奨アプローチ

**Option B（新規コンポーネント作成）** を推奨。

理由:
1. 既存の`releases.tsx`が既に大きく、拡張は保守性を低下させる
2. `discsRouter`パターンとの一貫性を維持できる
3. 独立したルートにより、将来の機能追加が容易

### 設計時の検討事項

1. **順序変更UI**: ドラッグ&ドロップ vs 上下ボタン
   - 初期実装は上下ボタンで十分か検討
   - ドラッグ&ドロップは追加ライブラリが必要（`@dnd-kit/core`等）

2. **サークル選択ダイアログの再利用性**:
   - 他の画面でも使用可能な汎用コンポーネントとして設計するか

3. **participationTypeフィールドの扱い**:
   - 固定値（プルダウン）vs 自由入力
   - 現在のスキーマは自由入力（text型）

### Research Needed

- ドラッグ&ドロップを採用する場合のライブラリ選定
- 既存のdaisyUIコンポーネントで対応可能なUIパターンの確認

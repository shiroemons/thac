# レガシーCSVインポート機能 実装計画

## 概要
旧東方編曲録で使用しているCSVファイルをインポートする管理画面を作成する。

## CSVフォーマット
```csv
circle,album,title,vocalists,arrangers,lyricists,original_songs,track_number,event
2nd-Phase,Invisible Girl,パレード,K,K,K,幽霊楽団　～ Phantom Ensemble,1,コミックマーケット105
A-One,Tempt Sign,Tempt Sign,Rute:あき,ELEMENTAS:DJ Command,Rute,おてんば恋娘,1,コミックマーケット105
SOUND HOLIC×Eurobeat Union,アルバム名,...  ← 複合サークル対応
```
- 各サークルの前にヘッダー行が入る（重複ヘッダー対応必要）
- vocalists, arrangers, lyricists, original_songs はコロン区切りで複数値
- **circle**: 「×」区切りで複数サークル（例: `SOUND HOLIC×Eurobeat Union`）

## 登録対象テーブル
1. `events` + `eventDays` （イベント）※eventSeriesは既存があれば使用
2. `circles` （サークル）※「×」区切りで分割登録
3. `releases` + `releaseCircles` （アルバム）※複合サークルは複数紐付け
4. `tracks` （トラック）
5. `artists` （アーティスト）
6. `trackCredits` + `trackCreditRoles` （クレジット: vocalist, arranger, lyricist）
7. `trackOfficialSongs` （原曲紐付け）

## スキーマ変更
### events.eventSeriesId を nullable に変更
- **ファイル**: `packages/db/src/schema/event.ts`
- 変更: `.notNull()` を削除
- マイグレーション実行が必要

## 画面フロー
```
Step 1: CSVアップロード → プレビュー表示
           ↓
Step 2: 原曲マッピング確認（部分一致候補から選択）
           ↓
Step 3: インポート結果表示
```

---

## 実装タスク

### Phase 0: スキーマ変更

#### 0.1 events.eventSeriesId を nullable に変更
- **ファイル**: `packages/db/src/schema/event.ts`
- `eventSeriesId: text("event_series_id").notNull()` → `eventSeriesId: text("event_series_id")`
- マイグレーション: `make db-generate && make db-migrate`

### Phase 1: サーバー側基盤

#### 1.1 CSVパーサー作成
- **ファイル**: `apps/server/src/utils/legacy-csv-parser.ts`
- 重複ヘッダー行のスキップ
- コロン区切りの複数値パース（artists, original_songs）
- **サークル分割**: 「×」区切りで複数サークルに分割
- イベント名パース（「コミックマーケット105」→ name + edition）

#### 1.2 インポートサービス作成
- **ファイル**: `apps/server/src/services/legacy-import-service.ts`
- 原曲マッチングロジック（完全一致 → 部分一致）
- 「オリジナル」の特殊処理
- Upsertロジック（トランザクション内で依存順に処理）

#### 1.3 APIエンドポイント作成
- **ファイル**: `apps/server/src/routes/admin/import/legacy.ts`
- `POST /preview` - CSVパース + 原曲マッチング結果
- `POST /execute` - インポート実行

#### 1.4 ルーター統合
- **ファイル**: `apps/server/src/routes/admin/index.ts`
- importRouterを追加

### Phase 2: フロントエンド

#### 2.1 インポートページ作成
- **ファイル**: `apps/web/src/routes/admin/_admin/import/legacy.tsx`
- 3ステップウィザードUI
- ensureQueryData + queryOptionsパターン使用

#### 2.2 コンポーネント作成
- **ファイル**: `apps/web/src/components/import/legacy-csv-upload.tsx`
  - ファイル選択、プレビュー表示
- **ファイル**: `apps/web/src/components/import/legacy-song-mapping.tsx`
  - 原曲マッピングUI、部分一致候補選択
- **ファイル**: `apps/web/src/components/import/legacy-import-result.tsx`
  - 作成/更新件数サマリー、エラー表示

#### 2.3 API クライアント追加
- **ファイル**: `apps/web/src/lib/api-client.ts`
- インポート関連のAPI関数追加

#### 2.4 ナビゲーション追加
- **ファイル**: `apps/web/src/components/admin/admin-layout.tsx`
- サイドバーに「インポート」セクション追加

---

## データ処理詳細

### Upsert順序（依存関係順）
```
1. events + eventDays（eventSeriesは既存があれば紐付け、なければnull）
2. circles（「×」区切りで分割、各サークルを個別登録）
3. artists（vocalists, arrangers, lyricistsから抽出）
4. releases（album名 + event）
5. releaseCircles（複合サークルは複数レコード登録）
6. tracks
7. trackCredits + trackCreditRoles
8. trackOfficialSongs
```

### サークル分割ロジック
```typescript
// 入力: "SOUND HOLIC×Eurobeat Union"
// 出力: ["SOUND HOLIC", "Eurobeat Union"]
function splitCircles(circleStr: string): string[] {
  return circleStr.split('×').map(s => s.trim());
}
```
- 分割後、各サークルをcirclesテーブルにupsert
- releaseCirclesで複数紐付け（position: 1, 2, ...）

### eventSeries処理
```typescript
// イベント名から既存のeventSeriesを検索
// 例: "コミックマーケット105" → eventSeries.name = "コミックマーケット" を検索
// 見つかれば紐付け、なければeventSeriesId = null
```

### 原曲マッチング
- 完全一致: 自動選択
- 部分一致: 候補表示（類似度順）
- 「オリジナル」: 既存の「オリジナル」レコードに紐付け
- マッチなし: 手動選択 or スキップ

### 重複判定キー
| テーブル | 判定キー |
|----------|----------|
| events | name（イベント名全体で検索） |
| circles | name |
| artists | name |
| releases | name + 最初のcircleId（+ eventDayId） |
| tracks | releaseId + trackNumber |

---

## ファイル一覧

### スキーマ変更
```
packages/db/src/schema/event.ts           # eventSeriesId を nullable に
```

### 新規作成
```
apps/server/src/
├── routes/admin/import/
│   ├── index.ts
│   └── legacy.ts
├── services/
│   └── legacy-import-service.ts
└── utils/
    └── legacy-csv-parser.ts

apps/web/src/
├── routes/admin/_admin/import/
│   └── legacy.tsx
└── components/import/
    ├── legacy-csv-upload.tsx
    ├── legacy-song-mapping.tsx
    └── legacy-import-result.tsx
```

### 変更
```
apps/server/src/routes/admin/index.ts      # importRouter追加
apps/web/src/lib/api-client.ts             # API関数追加
apps/web/src/components/admin/admin-layout.tsx  # ナビ追加
```

---

## 参照ファイル（既存パターン）
- `apps/server/src/routes/admin/master/import.ts` - 既存インポート処理
- `apps/web/src/components/import-dialog.tsx` - 既存インポートUI
- `packages/db/src/schema/track-relations.ts` - trackOfficialSongsスキーマ
- `packages/db/src/schema/official.ts` - officialSongsスキーマ

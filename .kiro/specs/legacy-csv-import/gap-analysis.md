# ギャップ分析: レガシーCSVインポート機能

## 分析サマリー

既存コードベースを調査した結果、以下が判明：

1. **インポート基盤が存在**: CSVパーサー、トランザクション処理、UIコンポーネントが既存
2. **スキーマ変更が必須**: `events.eventSeriesId`が現在`notNull`で制約解除が必要
3. **原曲マッチング機能は新規**: 部分一致・類似度検索は既存パターンにない
4. **クレジット処理の複雑性**: trackCredits + trackCreditRolesの二重構造への対応が必要
5. **複合サークル対応**: releaseCirclesの複数紐付けパターンは既存だが、自動分割は新規

---

## 1. 現状調査

### 1.1 関連ファイル・モジュール

| カテゴリ | ファイル | 役割 |
|----------|----------|------|
| **パーサー** | `apps/server/src/utils/import-parser.ts` | CSV/TSV/JSON パース、Zod バリデーション |
| **インポートAPI** | `apps/server/src/routes/admin/master/import.ts` | マスタデータインポート（トランザクション例） |
| **インポートUI** | `apps/web/src/components/import-dialog.tsx` | シンプルなインポートダイアログ |
| **イベントスキーマ** | `packages/db/src/schema/event.ts` | events.eventSeriesIdが`.notNull()` |
| **イベントバリデーション** | `packages/db/src/schema/event.validation.ts` | insertEventSchemaでeventSeriesIdが必須 |
| **トラックスキーマ** | `packages/db/src/schema/track.ts` | tracks, trackCredits, trackCreditRoles定義 |
| **原曲紐付け** | `packages/db/src/schema/track-relations.ts` | trackOfficialSongs定義 |
| **リリーススキーマ** | `packages/db/src/schema/release.ts` | releases, releaseCircles定義 |
| **公式楽曲** | `packages/db/src/schema/official.ts` | officialSongs（原曲マッチング対象） |
| **アーティスト/サークル** | `packages/db/src/schema/artist-circle.ts` | artists, circles定義 |
| **頭文字判定** | `packages/utils/src/initial-detector.ts` | detectInitial関数 |
| **管理サイドバー** | `apps/web/src/components/admin-sidebar.tsx` | ナビゲーション構造 |
| **管理ルーター** | `apps/server/src/routes/admin/index.ts` | APIルート統合ポイント |

### 1.2 既存パターン

#### インポートAPIパターン（`master/import.ts`）
```typescript
// ファイルアップロード → パース → バリデーション → トランザクション内upsert
const result = parseAndValidate(content, file.name, schema);
await db.transaction(async (tx) => {
  for (const item of data) {
    await tx.insert(table).values(item).onConflictDoUpdate({...});
  }
});
```

#### CSVパーサー（`import-parser.ts`）
- `parseCSV`: カンマ区切り、クォート対応
- `validateRows`: Zodスキーマによる全行バリデーション
- **制限**: 重複ヘッダー対応なし、コロン区切り複数値対応なし

#### 頭文字判定（`initial-detector.ts`）
```typescript
detectInitial("Beatles")   // { initialScript: "latin", nameInitial: "B" }
detectInitial("ピアノ")     // { initialScript: "katakana", nameInitial: "ひ" }
```
→ アーティスト・サークル登録時に必須

### 1.3 統合ポイント

| 統合先 | ファイル | 必要な変更 |
|--------|----------|-----------|
| サイドバー | `admin-sidebar.tsx` | 「インポート」セクション追加 |
| サーバールーター | `routes/admin/index.ts` | importRouterを追加 |
| APIクライアント | `apps/web/src/lib/api-client.ts` | インポート関連関数追加 |

---

## 2. 要件別ギャップ分析

### Requirement 1: CSVパース

| 機能 | 状態 | ギャップ |
|------|------|----------|
| CSVパース基本 | ✅ 既存 | - |
| クォート対応 | ✅ 既存 | - |
| 重複ヘッダースキップ | ❌ Missing | 新規実装必要 |
| コロン区切り複数値 | ❌ Missing | 新規実装必要 |
| 「×」区切りサークル分割 | ❌ Missing | 新規実装必要 |

### Requirement 2: 原曲マッピング

| 機能 | 状態 | ギャップ |
|------|------|----------|
| 完全一致検索 | ❌ Missing | SQLでWHERE name = ? |
| 部分一致検索 | ❌ Missing | SQLでWHERE name LIKE ? |
| 類似度スコアリング | ❌ Missing | **Research Needed**: 類似度アルゴリズム選定 |
| 「オリジナル」特殊処理 | ❌ Missing | isOriginal=true のレコード検索 |
| マッピングUI | ❌ Missing | 新規コンポーネント |

### Requirement 3: イベント・サークル・アーティスト登録

| 機能 | 状態 | ギャップ |
|------|------|----------|
| イベント登録 | ✅ 既存 | - |
| eventSeriesId nullable | ❌ Constraint | スキーマ変更必須 |
| eventSeries名前検索 | ❌ Missing | LIKE検索実装 |
| サークル登録 | ✅ 既存 | - |
| アーティスト登録 | ✅ 既存 | - |
| 頭文字自動判定 | ✅ 既存 | `detectInitial`使用 |

### Requirement 4: リリース・トラック登録

| 機能 | 状態 | ギャップ |
|------|------|----------|
| リリース登録 | ✅ 既存 | - |
| releaseCircles複数紐付け | ✅ 既存 | position順で登録 |
| トラック登録 | ✅ 既存 | - |
| releaseId+trackNumber upsert | ✅ 既存 | onConflictDoUpdateパターン |

### Requirement 5: クレジット・原曲紐付け

| 機能 | 状態 | ギャップ |
|------|------|----------|
| trackCredits登録 | ✅ 既存 | - |
| trackCreditRoles登録 | ✅ 既存 | - |
| role別登録(vocalist等) | ❌ Missing | roleCodeマッピング実装 |
| trackOfficialSongs登録 | ✅ 既存 | - |

### Requirement 6-8: UI・結果表示

| 機能 | 状態 | ギャップ |
|------|------|----------|
| 結果サマリー表示 | 🔶 部分 | 既存は単純、詳細表示拡張必要 |
| エラー詳細表示 | 🔶 部分 | 行単位エラー表示拡張必要 |
| 3ステップウィザード | ❌ Missing | 新規UI |
| サイドバー統合 | ✅ 既存パターン | navItems配列に追加 |

### Requirement 9: スキーマ変更

| 変更 | ファイル | 影響範囲 |
|------|----------|----------|
| eventSeriesId nullable | `packages/db/src/schema/event.ts` | `.notNull()`削除 |
| insertEventSchema修正 | `packages/db/src/schema/event.validation.ts` | `nonEmptyString` → `optional()` |
| マイグレーション | - | `make db-generate && make db-migrate` |

---

## 3. 実装アプローチオプション

### Option A: 既存コンポーネント拡張

**対象ファイル**:
- `import-parser.ts` にレガシーCSV専用パース関数追加
- `import-dialog.tsx` を拡張してウィザード化

**トレードオフ**:
- ✅ 既存パターンの再利用で開発速度向上
- ✅ コードベースの一貫性維持
- ❌ import-dialogが複雑化するリスク
- ❌ パーサーの責務が膨らむ

### Option B: 新規コンポーネント作成（推奨）

**新規ファイル**:
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

**トレードオフ**:
- ✅ 明確な責務分離
- ✅ 既存コードへの影響最小
- ✅ テスト容易性向上
- ❌ ファイル数増加
- ❌ パターン学習コスト

### Option C: ハイブリッドアプローチ

**既存拡張**:
- `import-parser.ts`: 汎用パース関数のみ追加

**新規作成**:
- インポートサービス、ウィザードUI、原曲マッピングUI

**トレードオフ**:
- ✅ パース処理は再利用可能に
- ✅ ビジネスロジックは分離
- ❌ 境界の判断が必要

---

## 4. 複雑性・リスク評価

### 工数見積

| 項目 | 見積 | 理由 |
|------|------|------|
| スキーマ変更 | S (1日) | 単純な制約変更+マイグレーション |
| CSVパーサー拡張 | S (1-2日) | 既存パターンを踏襲 |
| インポートサービス | M (3-5日) | 7テーブルへの依存順upsert |
| 原曲マッピングUI | M (3-4日) | 部分一致検索+選択UI |
| ウィザードUI | M (2-3日) | 3ステップフロー |
| **全体** | **L (1-2週間)** | 複数コンポーネントの統合 |

### リスク評価

| リスク | レベル | 対策 |
|--------|--------|------|
| 原曲マッチング精度 | Medium | 類似度アルゴリズムの選定が必要 |
| トランザクション複雑性 | Medium | 依存順序を明確に定義 |
| CSVフォーマット変動 | Low | ヘッダー検証で対応 |
| パフォーマンス | Low | バッチサイズ制御で対応可能 |

---

## 5. 設計フェーズへの推奨事項

### 推奨アプローチ
**Option B: 新規コンポーネント作成**を推奨

理由：
- 既存コードへの影響を最小化
- 機能の責務が明確に分離される
- 将来的な拡張（他フォーマット対応等）が容易

### 設計フェーズで決定すべき事項

1. **原曲マッチングアルゴリズム**
   - 完全一致優先 → 部分一致（LIKE） → 類似度スコア
   - 類似度計算: Levenshtein距離 or 単純な文字列包含

2. **エラーハンドリング戦略**
   - 全行ロールバック vs 部分成功許容
   - エラー行のスキップ方法

3. **eventSeries検索ロジック**
   - 前方一致（「コミックマーケット」→「コミックマーケット105」）
   - 既存シリーズがない場合のフォールバック

4. **UI状態管理**
   - ステップ間のデータ保持方法
   - 戻る操作時の状態復元

### Research Needed（設計フェーズで調査）

- [ ] 原曲名の類似度計算に最適なアルゴリズム
- [ ] 大量データ（数千行）インポート時のパフォーマンス要件
- [ ] CSVエンコーディング対応（UTF-8以外）

---

## 次のステップ

ギャップ分析完了。設計フェーズに進むには：

```
/kiro:spec-design legacy-csv-import
```

要件の承認も同時に行う場合：

```
/kiro:spec-design legacy-csv-import -y
```

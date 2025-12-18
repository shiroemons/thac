# 設計リサーチログ: artist-circle-management

## 1. 既存パターンの調査

### 1.1 データベーススキーマパターン

**参照ファイル**: `packages/db/src/schema/official.ts`

```typescript
// ID: text型、Nanoidをアプリ層で生成
id: text("id").primaryKey()

// タイムスタンプ: timestamp_msモード、SQLite関数でデフォルト値
createdAt: integer("created_at", { mode: "timestamp_ms" })
  .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
  .notNull()

updatedAt: integer("updated_at", { mode: "timestamp_ms" })
  .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
  .$onUpdate(() => new Date())
  .notNull()

// 外部キー: references関数で定義
categoryCode: text("category_code")
  .notNull()
  .references(() => officialWorkCategories.code)

// インデックス: テーブル定義の第3引数
(table) => [
  index("idx_official_works_category").on(table.categoryCode),
  uniqueIndex("uq_official_works_series_code").on(table.seriesCode),
]
```

### 1.2 バリデーションパターン

**参照ファイル**: `packages/db/src/schema/official.validation.ts`

```typescript
// drizzle-zodを使用してスキーマから生成
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ヘルパー定義
const nonEmptyString = z.string().trim().min(1, "必須項目です");
const optionalString = z.string().trim().optional().nullable();

// Insert用スキーマ（createdAt, updatedAt除外）
export const insertOfficialWorkSchema = createInsertSchema(officialWorks, {
  id: nonEmptyString,
  // カラムごとのカスタムバリデーション
}).omit({ createdAt: true, updatedAt: true });

// Update用スキーマ（id除外、全フィールドoptional）
export const updateOfficialWorkSchema = insertOfficialWorkSchema
  .omit({ id: true })
  .partial();

// 型エクスポート
export type InsertOfficialWork = z.infer<typeof insertOfficialWorkSchema>;
```

### 1.3 APIルートパターン

**参照ファイル**: `apps/server/src/routes/admin/official/works.ts`

- GET `/` - 一覧取得（page, limit, search, category）
- GET `/:id` - 詳細取得
- POST `/` - 新規作成（Zodバリデーション）
- PUT `/:id` - 更新
- DELETE `/:id` - 削除
- POST `/import` - 一括インポート

### 1.4 フロントエンドAPIクライアントパターン

**参照ファイル**: `apps/web/src/lib/api-client.ts`

```typescript
// インターフェース定義
export interface OfficialWork {
  id: string;
  // フィールド定義
  createdAt: string;
  updatedAt: string;
}

// APIクライアントオブジェクト
export const officialWorksApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) => {
    // URLSearchParamsでクエリ構築
    return fetchWithAuth<PaginatedResponse<OfficialWork>>(`/api/admin/official/works${query}`);
  },
  get: (id: string) => fetchWithAuth<OfficialWork>(`/api/admin/official/works/${id}`),
  create: (data: Omit<OfficialWork, "createdAt" | "updatedAt">) => { /* POST */ },
  update: (id: string, data: Partial<...>) => { /* PUT */ },
  delete: (id: string) => { /* DELETE */ },
};
```

## 2. マスタデータ参照

### 2.1 alias_types（別名義種別）

**参照先**: `packages/db/src/schema/master.ts`

```typescript
aliasTypes = sqliteTable("alias_types", {
  code: text("code").primaryKey(),  // 外部キー参照対象
  label: text("label").notNull(),
  description: text("description"),
})
```

### 2.2 platforms（プラットフォーム）

```typescript
platforms = sqliteTable("platforms", {
  code: text("code").primaryKey(),  // 外部キー参照対象
  name: text("name").notNull(),
  category: text("category"),
  urlPattern: text("url_pattern"),
  createdAt: ...,
  updatedAt: ...,
})
```

## 3. 技術的考慮事項

### 3.1 頭文字バリデーション

- `initial_script`: latin/hiragana/katakana/kanji/digit/symbol/other
- latin/hiragana/katakana の場合のみ `name_initial` が必須
- Zodの`refine`または`superRefine`で条件付きバリデーション実装

### 3.2 一意性チェック

- SQLite: COLLATE NOCASE は text型に対して利用可能
- 推奨: アプリ層で `lower()` 比較 + uniqueIndex

### 3.3 カスケード削除

```typescript
artistId: text("artist_id")
  .notNull()
  .references(() => artists.id, { onDelete: "cascade" })
```

### 3.4 ISO 8601日付

- text型で保存
- Zodでフォーマット検証: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`

## 4. 設計判断事項

| 項目 | 判断 | 理由 |
|------|------|------|
| APIパス | `/api/admin/artists`, `/api/admin/circles` | 既存パターン（official, master）と同階層 |
| サークルリンクUI | サークル詳細画面内のサブコンポーネント | 関連性が強く、独立画面は過剰 |
| インポート機能 | 初期実装では見送り | 優先度低、後から追加可能 |
| 頭文字自動判定 | 実装しない | 複雑性が高く、手動入力で十分 |

# 技術設計書: artist-circle-management

## 1. 概要

### 1.1 目的
同人音楽データベースにおけるアーティスト（個人クリエイター）、アーティスト別名義、サークル（制作グループ）、サークル外部リンクの管理機能を提供する。

### 1.2 スコープ
- 4つのデータベーステーブル（artists, artist_aliases, circles, circle_links）
- 4つのAPIルーター（各エンティティのCRUD操作）
- 3つの管理画面（アーティスト、別名義、サークル）
- 既存マスタデータ（alias_types, platforms）との連携

### 1.3 設計原則
- 既存パターン（official/works, master/platforms）との一貫性を維持
- Drizzle ORM + Zodによる型安全なデータ操作
- daisyUIコンポーネントによる統一されたUI/UX

---

## 2. アーキテクチャ

### 2.1 システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (TanStack Start)                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│  │ Artists Page    │ │ Aliases Page    │ │ Circles Page  │ │
│  └────────┬────────┘ └────────┬────────┘ └───────┬───────┘ │
│           │                   │                   │         │
│  ┌────────┴───────────────────┴───────────────────┴───────┐ │
│  │                    api-client.ts                       │ │
│  │  artistsApi / artistAliasesApi / circlesApi            │ │
│  └────────────────────────────┬───────────────────────────┘ │
└───────────────────────────────┼─────────────────────────────┘
                                │ HTTP
┌───────────────────────────────┼─────────────────────────────┐
│                    Backend (Hono)                           │
│  ┌────────────────────────────┴───────────────────────────┐ │
│  │                   Admin Auth Middleware                │ │
│  └────────────────────────────┬───────────────────────────┘ │
│           ┌───────────────────┼───────────────────┐         │
│  ┌────────┴────────┐ ┌────────┴────────┐ ┌────────┴───────┐ │
│  │ /admin/artists  │ │/admin/aliases   │ │ /admin/circles │ │
│  └────────┬────────┘ └────────┬────────┘ └────────┬───────┘ │
└───────────┼───────────────────┼───────────────────┼─────────┘
            │                   │                   │
┌───────────┼───────────────────┼───────────────────┼─────────┐
│           │      Database (SQLite/Turso)          │         │
│  ┌────────┴────────┐ ┌────────┴────────┐ ┌────────┴───────┐ │
│  │     artists     │ │ artist_aliases  │ │    circles     │ │
│  └─────────────────┘ └─────────────────┘ └───────┬────────┘ │
│                                                   │         │
│                                          ┌───────┴────────┐ │
│                                          │  circle_links  │ │
│                                          └────────────────┘ │
│  ┌─────────────────┐ ┌─────────────────┐                    │
│  │   alias_types   │ │    platforms    │  (既存マスタ)     │
│  └─────────────────┘ └─────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 ファイル構成

#### 新規作成ファイル

| レイヤー | ファイルパス | 内容 |
|---------|-------------|------|
| DB | `packages/db/src/schema/artist-circle.ts` | 4テーブル定義 |
| DB | `packages/db/src/schema/artist-circle.validation.ts` | Zodバリデーションスキーマ |
| API | `apps/server/src/routes/admin/artists/index.ts` | アーティストCRUD |
| API | `apps/server/src/routes/admin/artist-aliases/index.ts` | 別名義CRUD |
| API | `apps/server/src/routes/admin/circles/index.ts` | サークル+リンクCRUD |
| Frontend | `apps/web/src/routes/admin/_admin/artists/index.tsx` | アーティスト管理画面 |
| Frontend | `apps/web/src/routes/admin/_admin/artist-aliases/index.tsx` | 別名義管理画面 |
| Frontend | `apps/web/src/routes/admin/_admin/circles/index.tsx` | サークル管理画面 |

#### 修正ファイル

| ファイルパス | 変更内容 |
|-------------|---------|
| `packages/db/src/schema/index.ts` | 新スキーマのエクスポート追加 |
| `apps/server/src/routes/admin/index.ts` | 新ルーターの登録 |
| `apps/web/src/lib/api-client.ts` | 新APIクライアント追加 |
| `apps/web/src/components/admin-sidebar.tsx` | ナビゲーションメニュー追加 |

---

## 3. データモデル

### 3.1 テーブル定義

#### artists（アーティスト）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | text | PK | Nanoid |
| name | text | NOT NULL, UNIQUE(NOCASE) | 正式名称 |
| name_ja | text | NULL | 日本語名 |
| name_en | text | NULL | 英語名 |
| sort_name | text | NULL | ソート用名 |
| name_initial | text | 条件付き必須 | 頭文字（1文字） |
| initial_script | text | NOT NULL | 文字種 |
| notes | text | NULL | 備考 |
| created_at | integer | NOT NULL | 作成日時（timestamp_ms） |
| updated_at | integer | NOT NULL | 更新日時（timestamp_ms） |

**インデックス**:
- `idx_artists_name`: name
- `idx_artists_initial_script`: initial_script
- `uq_artists_name_lower`: lower(name) UNIQUE

#### artist_aliases（アーティスト別名義）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | text | PK | Nanoid |
| artist_id | text | NOT NULL, FK(artists.id, CASCADE) | 親アーティスト |
| name | text | NOT NULL | 別名義名 |
| alias_type_code | text | NULL, FK(alias_types.code) | 別名義種別 |
| name_initial | text | 条件付き必須 | 頭文字（1文字） |
| initial_script | text | NOT NULL | 文字種 |
| period_from | text | NULL | 使用開始日（ISO 8601） |
| period_to | text | NULL | 使用終了日（ISO 8601） |
| created_at | integer | NOT NULL | 作成日時 |
| updated_at | integer | NOT NULL | 更新日時 |

**インデックス**:
- `idx_artist_aliases_artist_id`: artist_id
- `uq_artist_aliases_artist_name`: (artist_id, lower(name)) UNIQUE

#### circles（サークル）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | text | PK | Nanoid |
| name | text | NOT NULL, UNIQUE(NOCASE) | 正式名称 |
| name_ja | text | NULL | 日本語名 |
| name_en | text | NULL | 英語名 |
| name_initial | text | 条件付き必須 | 頭文字（1文字） |
| initial_script | text | NOT NULL | 文字種 |
| notes | text | NULL | 備考 |
| created_at | integer | NOT NULL | 作成日時 |
| updated_at | integer | NOT NULL | 更新日時 |

**インデックス**:
- `idx_circles_name`: name
- `idx_circles_initial_script`: initial_script
- `uq_circles_name_lower`: lower(name) UNIQUE

#### circle_links（サークル外部リンク）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | text | PK | Nanoid |
| circle_id | text | NOT NULL, FK(circles.id, CASCADE) | 親サークル |
| platform_code | text | NOT NULL, FK(platforms.code, RESTRICT) | プラットフォーム |
| url | text | NOT NULL | URL |
| platform_id | text | NULL | プラットフォーム内ID |
| handle | text | NULL | ハンドル/ユーザー名 |
| is_official | integer | NOT NULL, DEFAULT 1 | 公式フラグ |
| is_primary | integer | NOT NULL, DEFAULT 0 | 代表フラグ |
| created_at | integer | NOT NULL | 作成日時 |
| updated_at | integer | NOT NULL | 更新日時 |

**インデックス**:
- `idx_circle_links_circle_id`: circle_id
- `uq_circle_links_circle_url`: (circle_id, url) UNIQUE

### 3.2 initial_script 列挙型

```typescript
type InitialScript =
  | "latin"     // A-Z, a-z
  | "hiragana"  // ぁ-ん
  | "katakana"  // ァ-ヶ
  | "kanji"     // 漢字
  | "digit"     // 0-9
  | "symbol"    // 記号
  | "other";    // その他
```

---

## 4. API設計

### 4.1 アーティストAPI

| Method | Path | 説明 | リクエスト | レスポンス |
|--------|------|------|-----------|-----------|
| GET | `/api/admin/artists` | 一覧取得 | `?page&limit&search&initialScript` | `PaginatedResponse<Artist>` |
| GET | `/api/admin/artists/:id` | 詳細取得 | - | `Artist` |
| POST | `/api/admin/artists` | 新規作成 | `InsertArtist` | `Artist` |
| PUT | `/api/admin/artists/:id` | 更新 | `UpdateArtist` | `Artist` |
| DELETE | `/api/admin/artists/:id` | 削除 | - | `{ success: boolean }` |

### 4.2 アーティスト別名義API

| Method | Path | 説明 | リクエスト | レスポンス |
|--------|------|------|-----------|-----------|
| GET | `/api/admin/artist-aliases` | 一覧取得 | `?page&limit&search&artistId` | `PaginatedResponse<ArtistAlias>` |
| GET | `/api/admin/artist-aliases/:id` | 詳細取得 | - | `ArtistAlias` |
| POST | `/api/admin/artist-aliases` | 新規作成 | `InsertArtistAlias` | `ArtistAlias` |
| PUT | `/api/admin/artist-aliases/:id` | 更新 | `UpdateArtistAlias` | `ArtistAlias` |
| DELETE | `/api/admin/artist-aliases/:id` | 削除 | - | `{ success: boolean }` |

### 4.3 サークルAPI

| Method | Path | 説明 | リクエスト | レスポンス |
|--------|------|------|-----------|-----------|
| GET | `/api/admin/circles` | 一覧取得 | `?page&limit&search&initialScript` | `PaginatedResponse<Circle>` |
| GET | `/api/admin/circles/:id` | 詳細取得（リンク含む） | - | `CircleWithLinks` |
| POST | `/api/admin/circles` | 新規作成 | `InsertCircle` | `Circle` |
| PUT | `/api/admin/circles/:id` | 更新 | `UpdateCircle` | `Circle` |
| DELETE | `/api/admin/circles/:id` | 削除（リンクも削除） | - | `{ success: boolean }` |

### 4.4 サークルリンクAPI

| Method | Path | 説明 | リクエスト | レスポンス |
|--------|------|------|-----------|-----------|
| GET | `/api/admin/circles/:circleId/links` | リンク一覧 | - | `CircleLink[]` |
| POST | `/api/admin/circles/:circleId/links` | リンク追加 | `InsertCircleLink` | `CircleLink` |
| PUT | `/api/admin/circles/:circleId/links/:id` | リンク更新 | `UpdateCircleLink` | `CircleLink` |
| DELETE | `/api/admin/circles/:circleId/links/:id` | リンク削除 | - | `{ success: boolean }` |

### 4.5 エラーレスポンス

| HTTPステータス | 状況 | レスポンス |
|---------------|------|-----------|
| 400 | バリデーションエラー | `{ error: string, details?: ZodError }` |
| 401 | 未認証 | `{ error: "Unauthorized" }` |
| 404 | リソース不存在 | `{ error: "Not found" }` |
| 409 | 一意性制約違反 | `{ error: "Already exists" }` |

---

## 5. コンポーネントインターフェース

### 5.1 TypeScript型定義

```typescript
// 頭文字文字種
type InitialScript = "latin" | "hiragana" | "katakana" | "kanji" | "digit" | "symbol" | "other";

// アーティスト
interface Artist {
  id: string;
  name: string;
  nameJa: string | null;
  nameEn: string | null;
  sortName: string | null;
  nameInitial: string | null;
  initialScript: InitialScript;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// アーティスト別名義
interface ArtistAlias {
  id: string;
  artistId: string;
  name: string;
  aliasTypeCode: string | null;
  nameInitial: string | null;
  initialScript: InitialScript;
  periodFrom: string | null;
  periodTo: string | null;
  createdAt: string;
  updatedAt: string;
  // 結合データ
  artistName?: string;
  aliasTypeLabel?: string;
}

// サークル
interface Circle {
  id: string;
  name: string;
  nameJa: string | null;
  nameEn: string | null;
  nameInitial: string | null;
  initialScript: InitialScript;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// サークル外部リンク
interface CircleLink {
  id: string;
  circleId: string;
  platformCode: string;
  url: string;
  platformId: string | null;
  handle: string | null;
  isOfficial: boolean;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  // 結合データ
  platformName?: string;
}

// サークル（リンク付き）
interface CircleWithLinks extends Circle {
  links: CircleLink[];
}
```

### 5.2 バリデーションスキーマ

```typescript
// 共通ヘルパー
const nonEmptyString = z.string().trim().min(1, "必須項目です");
const optionalString = z.string().trim().optional().nullable();

const initialScriptSchema = z.enum([
  "latin", "hiragana", "katakana", "kanji", "digit", "symbol", "other"
]);

// 頭文字の条件付きバリデーション
const nameInitialSchema = z.string().length(1, "1文字で入力してください").optional().nullable();

// アーティスト
const insertArtistSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString.max(200),
  nameJa: optionalString.transform(v => v || null),
  nameEn: optionalString.transform(v => v || null),
  sortName: optionalString.transform(v => v || null),
  nameInitial: nameInitialSchema,
  initialScript: initialScriptSchema,
  notes: optionalString.transform(v => v || null),
}).refine(
  (data) => {
    const requiresInitial = ["latin", "hiragana", "katakana"].includes(data.initialScript);
    return !requiresInitial || (data.nameInitial && data.nameInitial.length === 1);
  },
  { message: "この文字種では頭文字の入力が必須です", path: ["nameInitial"] }
);
```

---

## 6. UI設計

### 6.1 画面一覧

| 画面 | パス | 機能 |
|------|------|------|
| アーティスト一覧 | `/admin/artists` | 検索、フィルタ、CRUD |
| 別名義一覧 | `/admin/artist-aliases` | 検索、アーティストフィルタ、CRUD |
| サークル一覧 | `/admin/circles` | 検索、フィルタ、CRUD、リンク管理 |

### 6.2 共通コンポーネント

| コンポーネント | 用途 |
|---------------|------|
| `DataTableActionBar` | 検索バー、新規作成ボタン |
| `DataTablePagination` | ページネーション |
| `CreateDialog` / `Dialog` | 作成・編集モーダル |
| `ConfirmDialog` | 削除確認 |
| `Toast` | 成功・エラー通知 |

### 6.3 フォーム構成

#### アーティストフォーム
- 名前（必須）
- 日本語名
- 英語名
- ソート用名
- 頭文字の文字種（必須、セレクト）
- 頭文字（条件付き必須）
- 備考

#### 別名義フォーム
- アーティスト（必須、セレクト + 「新規作成」ボタン）
  - 「新規作成」クリックでアーティスト作成ダイアログを表示（ネストモーダル）
  - 作成完了後、新規アーティストが自動選択される
- 別名義名（必須）
- 別名義種別（セレクト）
- 頭文字の文字種（必須、セレクト）
- 頭文字（条件付き必須）
- 使用開始日
- 使用終了日

#### サークルフォーム
- 名前（必須）
- 日本語名
- 英語名
- 頭文字の文字種（必須、セレクト）
- 頭文字（条件付き必須）
- 備考
- 外部リンク一覧（サブフォーム）

---

## 7. セキュリティ考慮事項

### 7.1 認証・認可
- すべてのAPIエンドポイントで`admin-auth`ミドルウェアを適用
- 未認証リクエストは401を返却
- フロントエンドは未認証時にログイン画面へリダイレクト

### 7.2 入力バリデーション
- クライアント側: React Hook Form + Zod
- サーバー側: Hono + Zod（@hono/zod-validator）
- SQLインジェクション対策: Drizzle ORMのパラメータ化クエリ

### 7.3 XSS対策
- Reactのデフォルトエスケープ機能を利用
- 生のHTML挿入は使用しない

---

## 8. パフォーマンス考慮事項

### 8.1 データベース
- 検索対象カラム（name, name_ja, name_en）にインデックス
- initial_scriptカラムにインデックス（フィルタ用）
- ページネーション（デフォルト20件、最大100件）

### 8.2 フロントエンド
- TanStack Queryによるキャッシュ（staleTime: 5分）
- 検索デバウンス（300ms）
- 仮想スクロールは不要（ページネーションで対応）

---

## 9. 要件トレーサビリティ

| 要件ID | 設計要素 |
|--------|---------|
| Req 1 | artists テーブル、`/admin/artists` API、アーティスト管理画面 |
| Req 2 | artist_aliases テーブル、`/admin/artist-aliases` API、別名義管理画面 |
| Req 3 | circles テーブル、`/admin/circles` API、サークル管理画面 |
| Req 4 | circle_links テーブル、`/admin/circles/:id/links` API、サークル画面内サブフォーム |
| Req 5 | アーティスト一覧API（page, limit, search, initialScript） |
| Req 6 | 別名義一覧API（page, limit, search, artistId） |
| Req 7 | サークル一覧API（page, limit, search, initialScript） |
| Req 8 | Zodバリデーションスキーマ（クライアント・サーバー両方） |
| Req 9 | daisyUIコンポーネント、既存DataTable系コンポーネント |
| Req 10 | admin-authミドルウェア、401/404/409レスポンス |
| Req 11 | インデックス、ページネーション、TanStack Query |

---

## 10. 実装順序の推奨

1. **Phase 1: データベース層**
   - artist-circle.ts（4テーブル定義）
   - artist-circle.validation.ts（Zodスキーマ）
   - index.ts更新（エクスポート追加）
   - マイグレーション実行

2. **Phase 2: API層**
   - artists/index.ts（アーティストCRUD）
   - artist-aliases/index.ts（別名義CRUD）
   - circles/index.ts（サークル+リンクCRUD）
   - admin/index.ts更新（ルーター登録）

3. **Phase 3: フロントエンド層**
   - api-client.ts更新（型定義・APIクライアント）
   - artists/index.tsx（アーティスト管理画面）
   - artist-aliases/index.tsx（別名義管理画面）
   - circles/index.tsx（サークル管理画面）
   - admin-sidebar.tsx更新（ナビゲーション追加）

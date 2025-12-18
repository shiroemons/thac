# ギャップ分析: artist-circle-management

## 1. 現状調査

### 1.1 既存アセット

#### データベーススキーマ（packages/db/src/schema/）
| ファイル | 内容 | 再利用可能性 |
|---------|------|-------------|
| `master.ts` | platforms, aliasTypes, creditRoles, officialWorkCategories | ✅ alias_types, platforms参照可能 |
| `official.ts` | officialWorks, officialSongs | 📋 パターン参照 |
| `auth.ts` | user, session, account, verification | - |
| `*.validation.ts` | Zodバリデーションスキーマ | 📋 パターン参照 |

#### APIサーバー（apps/server/src/routes/admin/）
| ファイル | 機能 | 再利用可能性 |
|---------|------|-------------|
| `official/works.ts` | CRUD + 検索 + ページネーション + インポート | 📋 パターン参照 |
| `master/platforms.ts` | マスタデータCRUD | 📋 パターン参照 |
| `middleware/admin-auth.ts` | 認証ミドルウェア | ✅ そのまま使用 |
| `utils/import-parser.ts` | CSV/JSONインポート | ✅ そのまま使用 |

#### フロントエンド（apps/web/src/）
| ディレクトリ/ファイル | 内容 | 再利用可能性 |
|---------|------|-------------|
| `routes/admin/_admin/official/works.tsx` | 公式作品管理画面 | 📋 パターン参照 |
| `components/admin/` | DataTable系、AdminPageHeader等 | ✅ そのまま使用 |
| `components/ui/` | daisyUIベースコンポーネント | ✅ そのまま使用 |
| `lib/api-client.ts` | API呼び出し関数、型定義 | ✅ 拡張して使用 |
| `hooks/use-debounce.ts` | 検索デバウンス | ✅ そのまま使用 |

### 1.2 確立されたパターン

#### スキーマ定義パターン
```typescript
// ID: Nanoid（アプリ層で生成）
id: text("id").primaryKey()

// タイムスタンプ
createdAt: integer("created_at", { mode: "timestamp_ms" })
  .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
  .notNull()

// 外部キー（カスケード削除）
artistId: text("artist_id")
  .notNull()
  .references(() => artists.id, { onDelete: "cascade" })
```

#### APIルートパターン
- GET `/` - 一覧（page, limit, search クエリパラメータ）
- GET `/:id` - 詳細取得
- POST `/` - 新規作成（Zodバリデーション）
- PUT `/:id` - 更新
- DELETE `/:id` - 削除
- POST `/import` - 一括インポート

#### フロントエンドパターン
- `createFileRoute` でルート定義
- `useQuery` + `useQueryClient` でデータ管理
- `DataTableActionBar` + `DataTablePagination` で一覧UI
- `CreateDialog` / `Dialog` でフォーム
- `useDebounce` で検索最適化

---

## 2. 要件実現可能性分析

### 2.1 必要な技術要素

| 要件 | 必要な要素 | 既存/新規 | ギャップ |
|------|-----------|----------|---------|
| Req 1: アーティスト管理 | artists テーブル、API、画面 | 新規 | Missing |
| Req 2: 別名義管理 | artist_aliases テーブル、API、画面 | 新規 | Missing |
| Req 3: サークル管理 | circles テーブル、API、画面 | 新規 | Missing |
| Req 4: サークルリンク | circle_links テーブル、API | 新規 | Missing |
| Req 5-7: 一覧・検索 | 既存パターン適用 | 既存 | - |
| Req 8: バリデーション | Zodスキーマ | 新規 | Missing |
| Req 9: UI/UX | 既存コンポーネント | 既存 | - |
| Req 10: 認証 | admin-auth ミドルウェア | 既存 | - |
| Req 11: パフォーマンス | インデックス、ページネーション | 新規+既存 | Partial |

### 2.2 固有の技術要件

| 要件 | 技術的課題 | 対応方針 |
|------|-----------|---------|
| 頭文字・文字種管理 | initial_script enum、条件付きバリデーション | Zodのrefineで実装 |
| 大文字小文字無視の一意性 | SQLiteのCOLLATE NOCASEまたはアプリ層チェック | `lower()` + アプリ層チェック |
| カスケード削除 | 外部キー制約 | `onDelete: "cascade"` |
| マスタデータ参照 | alias_types, platforms への外部キー | 既存テーブル参照 |
| 使用期間（ISO 8601） | 日付文字列フィールド | text型 + Zodバリデーション |

---

## 3. 実装アプローチ選択肢

### Option A: 既存コンポーネント拡張
**不採用**: 新しいドメイン（アーティスト、サークル）は既存テーブルとは独立しており、拡張ではなく新規作成が適切。

### Option B: 新規コンポーネント作成（推奨）
**採用理由**:
- アーティスト・サークルは独立したドメイン
- 既存パターンに完全に従うことで一貫性を維持
- 既存UIコンポーネントを再利用可能

**作成が必要なファイル**:

| レイヤー | ファイル | 内容 |
|---------|---------|------|
| DB | `packages/db/src/schema/artist-circle.ts` | 4テーブル定義 |
| DB | `packages/db/src/schema/artist-circle.validation.ts` | Zodスキーマ |
| API | `apps/server/src/routes/admin/artists/artists.ts` | アーティストCRUD |
| API | `apps/server/src/routes/admin/artists/artist-aliases.ts` | 別名義CRUD |
| API | `apps/server/src/routes/admin/circles/circles.ts` | サークルCRUD |
| API | `apps/server/src/routes/admin/circles/circle-links.ts` | リンクCRUD |
| Frontend | `apps/web/src/routes/admin/_admin/artists/index.tsx` | アーティスト一覧 |
| Frontend | `apps/web/src/routes/admin/_admin/artist-aliases/index.tsx` | 別名義一覧 |
| Frontend | `apps/web/src/routes/admin/_admin/circles/index.tsx` | サークル一覧 |
| Frontend | `apps/web/src/lib/api-client.ts` | 型定義・API関数追加 |

**修正が必要なファイル**:
| ファイル | 変更内容 |
|---------|---------|
| `packages/db/src/schema/index.ts` | 新スキーマのエクスポート追加 |
| `apps/server/src/routes/admin/index.ts` | 新ルーターの登録 |
| `apps/web/src/components/admin-sidebar.tsx` | ナビゲーションメニュー追加 |

### Option C: ハイブリッドアプローチ
**不採用**: 機能が明確に定義されており、段階的アプローチは不要。

---

## 4. 工数・リスク評価

### 工数: **M（3-7日）**
- DB: 4テーブル + バリデーション（1日）
- API: 4ルーター + 12エンドポイント（1-2日）
- Frontend: 3管理画面（2-3日）
- 統合・テスト（1日）

**根拠**: 既存パターンが確立されており、ほぼコピー&適応で実装可能

### リスク: **Low**
- ✅ 既存パターンに完全に従う
- ✅ 使い慣れた技術スタック
- ✅ マスタデータ（alias_types, platforms）は既存
- ⚠️ 頭文字バリデーションは若干複雑だが、Zodで対応可能

---

## 5. 設計フェーズへの引継ぎ事項

### 決定事項
1. **実装アプローチ**: Option B（新規コンポーネント作成）
2. **ID生成**: Nanoid（既存パターン踏襲）
3. **一意性チェック**: アプリ層で`lower()`を使用した比較

### 要調査事項
1. **サークルリンク管理画面**: 独立画面 vs サークル詳細画面内の子コンポーネント
2. **頭文字自動判定**: 名前入力から自動判定するヘルパー関数の実装有無

### 設計フェーズで決定すべき事項
1. 具体的なカラム定義（文字数制限等）
2. APIパス設計（`/admin/artists` vs `/admin/artist-circle/artists`）
3. フロントエンドルート構造
4. インポート機能の対応有無（優先度低）

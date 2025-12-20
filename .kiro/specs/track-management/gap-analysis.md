# Gap Analysis: Track Management

## 1. Current State Investigation

### 1.1 既存アセット

#### データベーススキーマ（packages/db/src/schema/）
| ファイル | 関連性 | 備考 |
|---------|--------|------|
| `release.ts` | **高** | releases, discs, releaseCircles定義 - tracksの親テーブル |
| `release.validation.ts` | **高** | Zodバリデーションスキーマのパターン |
| `artist-circle.ts` | **高** | artists, artistAliases定義 - track_creditsの参照先 |
| `master.ts` | **中** | creditRoles, aliasTypes定義 - track_creditsの参照先 |

#### APIルート（apps/server/src/routes/admin/releases/）
| ファイル | 関連性 | 備考 |
|---------|--------|------|
| `discs.ts` | **高** | ディスクCRUD - tracksと同階層の実装パターン |
| `release-circles.ts` | **高** | 中間テーブルのCRUD、position管理パターン |
| `releases.ts` | **中** | リリースCRUD、discs結合パターン |

#### フロントエンド（apps/web/src/routes/admin/_admin/）
| ファイル | 関連性 | 備考 |
|---------|--------|------|
| `releases_.$id.tsx` | **高** | 作品詳細画面 - トラック管理UIの追加先 |
| `artist-aliases.tsx` | **中** | 別名義選択UIのパターン |

### 1.2 コード規約

#### 命名規則
- **テーブル名**: snake_case（tracks, track_credits, track_credit_roles）
- **TypeScript変数**: camelCase（tracks, trackCredits, trackCreditRoles）
- **ルートファイル**: kebab-case（artist-aliases.tsx）

#### レイヤー構成
```
packages/db/src/schema/
  ├── {domain}.ts           # スキーマ定義
  └── {domain}.validation.ts # Zodスキーマ

apps/server/src/routes/admin/
  └── {domain}/
      ├── index.ts          # ルーターエントリ
      └── {sub-domain}.ts   # サブリソースルート

apps/web/src/lib/
  └── api-client.ts         # API関数定義
```

#### 依存方向
- `apps/server` → `@thac/db`（スキーマ・バリデーション）
- `apps/web` → API経由（`api-client.ts`）

### 1.3 統合ポイント

#### データモデル
- `tracks.release_id` → `releases.id`（CASCADE）
- `tracks.disc_id` → `discs.id`（CASCADE、NULL許容）
- `track_credits.artist_id` → `artists.id`（RESTRICT）
- `track_credits.artist_alias_id` → `artist_aliases.id`（SET NULL）
- `track_credit_roles.role_code` → `credit_roles.code`

#### API統合
- `/api/admin/releases/:releaseId/tracks` - トラックCRUD
- `/api/admin/releases/:releaseId/tracks/:trackId/credits` - クレジットCRUD
- `/api/admin/releases/:releaseId/tracks/:trackId/credits/:creditId/roles` - 役割CRUD

#### UI統合
- `releases_.$id.tsx`に新規セクション追加（ディスクカード・サークルカードと同パターン）

---

## 2. Requirements Feasibility Analysis

### 2.1 技術要件マッピング

| 要件 | データモデル | API | UI | ビジネスルール |
|------|-------------|-----|-----|--------------|
| Req1: トラック基本情報 | tracks | CRUD | フォーム・ダイアログ | name必須、track_number正の整数 |
| Req2: ディスク関連 | disc_id NULL許容 | ディスク選択API | セレクト | 条件付き一意制約 |
| Req3: 並び順 | track_number | PATCH position | 上下ボタン | 自動再採番 |
| Req4: クレジット | track_credits | CRUD | ネスト管理 | credit_name必須、重複防止 |
| Req5: 役割 | track_credit_roles | CRUD | 複数選択 | role_code存在チェック |
| Req6: 一覧表示 | - | GET with join | テーブル表示 | ディスクグルーピング |
| Req7: データ整合性 | FK制約 | - | - | CASCADE/RESTRICT/SET NULL |

### 2.2 ギャップ分析

#### Missing（新規実装必要）
| 項目 | 詳細 | 複雑度 |
|------|------|--------|
| tracksスキーマ | 新規テーブル定義 | Low |
| trackCreditsスキーマ | 新規テーブル定義 | Medium |
| trackCreditRolesスキーマ | 新規テーブル定義 | Low |
| 条件付き一意インデックス | disc_id有無で異なる制約 | **Research Needed** |
| トラックAPI | CRUD + 並び順 | Medium |
| クレジットAPI | CRUD + ネスト構造 | Medium |
| 役割API | CRUD | Low |
| トラック管理UI | 作品詳細に追加 | Medium |
| クレジット管理UI | ネストダイアログ | Medium |

#### Constraint（既存パターンからの制約）
| 項目 | 制約内容 |
|------|---------|
| ID生成 | nanoid使用（フロントエンドで生成） |
| タイムスタンプ | integer mode timestamp_ms |
| バリデーション | drizzle-zod + カスタムZod |
| 並び順更新 | 2レコード同時更新パターン（releaseCircles参照） |

#### Research Needed
| 項目 | 調査内容 |
|------|---------|
| SQLite部分インデックス | Drizzle ORMでWHERE句付きUNIQUE INDEXのサポート状況 |
| 複合外部キー | `(disc_id, release_id)` → `discs(id, release_id)` の実装方法 |
| RESTRICT制約 | アーティスト削除時のエラーハンドリングUI |

### 2.3 複雑度シグナル

| カテゴリ | 評価 |
|---------|------|
| CRUD操作 | ✅ 既存パターン踏襲 |
| アルゴリズム | ⚠️ 並び順再採番ロジック |
| ワークフロー | ⚠️ クレジット→役割のネスト管理 |
| 外部統合 | ✅ なし |

---

## 3. Implementation Approach Options

### Option A: Extend Existing Components

#### 対象ファイル
```
packages/db/src/schema/release.ts          # tracks, trackCredits, trackCreditRoles追加
packages/db/src/schema/release.validation.ts # バリデーションスキーマ追加
apps/server/src/routes/admin/releases/     # tracks.ts, track-credits.ts追加
apps/web/src/routes/admin/_admin/releases_.$id.tsx # トラックセクション追加
apps/web/src/lib/api-client.ts             # tracksApi, trackCreditsApi追加
```

#### 利点
- ✅ 既存ファイル構成を維持
- ✅ release関連スキーマが1ファイルに集約
- ✅ ルーティング構造がシンプル

#### 懸念点
- ❌ release.tsが大きくなる（現在113行 → 推定250行以上）
- ❌ releases_.$id.tsxが複雑化（現在812行 → 推定1200行以上）

### Option B: Create New Components

#### 新規ファイル構成
```
packages/db/src/schema/
  ├── track.ts              # tracks, trackCredits, trackCreditRoles
  └── track.validation.ts   # バリデーションスキーマ

apps/server/src/routes/admin/
  └── tracks/
      ├── index.ts          # tracksRouter
      ├── credits.ts        # trackCreditsRouter
      └── roles.ts          # trackCreditRolesRouter

apps/web/src/routes/admin/_admin/
  └── releases_.$id/
      ├── index.tsx         # リファクタ後のメイン
      └── tracks.tsx        # トラック管理コンポーネント
```

#### 利点
- ✅ 関心の分離が明確
- ✅ 単独テスト容易
- ✅ 将来の拡張性

#### 懸念点
- ❌ ファイル数増加
- ❌ TanStack Routerのネストルート設計が必要
- ❌ 既存パターンと異なる構造

### Option C: Hybrid Approach（推奨）

#### 構成
```
# Phase 1: スキーマ・APIは分離
packages/db/src/schema/
  ├── track.ts              # 新規
  └── track.validation.ts   # 新規

apps/server/src/routes/admin/releases/
  ├── tracks.ts             # トラック + クレジット + 役割（1ファイル）
  └── index.ts              # tracksRouter追加

# Phase 2: UIはコンポーネント分離
apps/web/src/routes/admin/_admin/
  └── releases_.$id.tsx     # 既存ファイルに追加（コンポーネント分離）

apps/web/src/components/admin/
  └── TrackManagement.tsx   # 抽出コンポーネント
```

#### 利点
- ✅ スキーマは独立（track.tsは単独で理解可能）
- ✅ APIは既存構造に統合（releases/配下）
- ✅ UIは段階的に分離可能
- ✅ 既存パターンと整合性あり

#### 懸念点
- ⚠️ UIファイルサイズ問題は残存（ただし将来分離可能）

---

## 4. Implementation Complexity & Risk

### Effort: **M（3-7日）**
**理由:**
- 新規テーブル3つ、スキーマ定義は既存パターン踏襲
- APIは3階層（tracks → credits → roles）だが、既存パターン適用可能
- UIは既存releases_.$id.tsxへの追加が中心
- 条件付きインデックスの調査が必要

### Risk: **Medium**
**理由:**
- SQLite部分インデックスのDrizzle対応が不明確
- ネストしたCRUD（track → credit → role）のUI設計がやや複雑
- 既存パターンが確立されているため、技術的な不確実性は限定的

---

## 5. Recommendations for Design Phase

### 推奨アプローチ
**Option C: Hybrid Approach** を採用

### 設計フェーズで決定すべき事項

1. **条件付きインデックス**
   - Drizzleで `WHERE disc_id IS NULL` のサポート確認
   - サポートなしの場合、アプリケーション層での一意性チェック設計

2. **APIエンドポイント構造**
   ```
   /api/admin/releases/:releaseId/tracks
   /api/admin/releases/:releaseId/tracks/:trackId
   /api/admin/releases/:releaseId/tracks/:trackId/credits
   /api/admin/releases/:releaseId/tracks/:trackId/credits/:creditId/roles
   ```
   vs フラット構造の検討

3. **クレジット・役割のUI設計**
   - インライン編集 vs モーダル
   - 役割の複数選択UI（チェックボックス vs タグ入力）

4. **トラック一覧のグルーピング**
   - ディスクごとのアコーディオン vs フラットリスト + フィルタ

### 持ち越し調査項目

- [ ] Drizzle ORMの部分インデックス（WHERE句）サポート
- [ ] SQLiteの複合外部キー制約の挙動確認
- [ ] TanStack Queryのネストクエリ最適化パターン

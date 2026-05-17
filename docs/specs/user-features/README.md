# ユーザー機能拡充 全体設計仕様書

> **ステータス**: 設計仕様（実装はサブプロジェクト単位で別途計画）
> **対象**: Phase 1 〜 Phase 3 の全体設計を確定し、Phase 4 はスコープ外として明記する
> **本仕様書のゴール**: 各 Phase をいつ・どの順番でも実装着手できるよう、データモデル・API・UI・横断事項を一貫した方針で固定すること

---

## Context

thac は東方 Project 同人音楽データベース。現状はコンテンツマスタ（楽曲・アルバム・サークル・原曲）に特化しており、ユーザー紐付けテーブルは `album_requests` のみ。再生機能は持たない。

ユーザー要望:

- サークル / アルバム / 楽曲をお気に入り登録したい
- カテゴリ別にアルバム・楽曲を保存・登録したい
- 楽曲をプレイリストにまとめて公開・非公開・SNS共有したい
- 原曲の分析・統計を出せると良い

これらは独立した複数のサブシステムなので、**3 つの Phase に分けて段階的に提供する**設計とする。コードベース調査の結果、ユーザーゾーン (`/user/_user.tsx`)・認証ミドルウェア・統計実装・Meilisearch・Better-Auth の土台はすでに整っているため、フェーズ毎にきれいに積み上げられる。

---

## 全体ロードマップ

```
Phase 1【基礎データ層】 お気に入り + コレクション（統合モデル）
   └ user_collections + user_collection_items
   └ kind = 'collection'、3 タイプ（circle/album/track）混在 OK
   └ default Liked コレクションを内部的に「お気に入り♥」UIに割当

Phase 2【共有・公開】 プレイリスト + SNS 共有
   └ 同テーブル user_collections.kind = 'playlist'
   └ track 限定・position 必須
   └ visibility = private | unlisted | public
   └ 公開URL /p/<short_id>、静的OG画像、SNSボタン4種
   └ /sitemap-playlists.xml
   └ ★ 動的OG画像は本Phaseでは実装せず、設計のみ記録（後述2.3.2）

Phase 3【分析】 ユーザー統計 + プレイリスト統計
   └ /user/statistics（自分のコレクション・プレイリスト傾向）
   └ /p/<short_id>（プレイリスト固有の統計）
   └ サイト平均との偏差表示
   └ 既存 work-stats-section を userId フィルタで再利用

Phase 4 以降 ── 本仕様書のスコープ外（将来検討）
   └ レビュー/★評価、フォロー/タイムライン、コンプ進捗、コラボ編集、
      インポート/エクスポート、自動タグ提案
```

依存関係:

- Phase 2 は Phase 1 の `user_collections` を `kind` で拡張するだけなので、独立リリース可能
- Phase 3 は Phase 1/2 のデータが溜まってから意味を持つが、データなしでも空状態 UI で先行リリース可能

---

## 1. Phase 1: お気に入り + コレクション（基礎データ層）

### 1.1 データモデル

```text
user_collections
├ id              uuid primary key
├ user_id         text not null (fk → user.id, on delete cascade)
├ kind            text not null check in ('collection','playlist')
│                                          ★ Phase 1 では 'collection' のみ
├ name            text not null (varchar 100, ユーザー編集可)
├ description     text nullable (varchar 500)
├ visibility      text not null default 'private'
│                 check in ('private','unlisted','public')
├ ordered         boolean not null default false
│                 ★ Phase 1 collection は false 既定、Phase 2 playlist は true 強制
├ is_default_liked boolean not null default false
│                 ★ ユーザー毎に true は最大1件（部分ユニーク制約）
├ short_id        text nullable (8文字 nanoid, unlisted/public 時のみ生成)
│                 ★ Phase 2 で本格利用、Phase 1 では nullable
├ cover_image_url text nullable (将来用、Phase 1 では未使用)
├ created_at      timestamp not null default now()
└ updated_at      timestamp not null default now() on update

INDEX (user_id, kind)
UNIQUE INDEX (user_id) WHERE is_default_liked = true
UNIQUE INDEX (short_id) WHERE short_id IS NOT NULL

user_collection_items
├ id              uuid primary key
├ collection_id   uuid not null (fk → user_collections.id, on delete cascade)
├ target_type     text not null check in ('circle','album','track')
├ target_id       uuid not null
├ position        integer nullable
│                 ★ collection は null OK、playlist は NOT NULL（アプリ層で保証）
├ note            text nullable (varchar 280)
├ added_at        timestamp not null default now()
└ ※ target_id への外部キーは tabletype 別のため CHECK + アプリ層で整合性保証

UNIQUE INDEX (collection_id, target_type, target_id) ★ 重複追加防止
INDEX (target_type, target_id)                       ★ 逆引き（この曲をお気に入り中の人数等）
INDEX (collection_id, position) WHERE position IS NOT NULL
```

**設計上の補足**:

- `target_id` は対象テーブル別の異種参照のため、PostgreSQL の通常の FK では参照できない。**論理参照** とし、アプリ層で挿入時に対象存在を検証 + 対象削除時の cleanup ジョブを用意する（後述）
- `is_default_liked` の Liked コレクションは **最初の♥押下時に lazy 作成**（ユーザー作成時に作らない）。理由: 全ユーザーに必ず 1 件作る必要はなく、新規ユーザーが何もしない場合の不要レコードを避ける
- 1 ユーザーあたり最大コレクション数 = **100 件**、1 コレクションあたり最大アイテム数 = **1000 件**。アプリ層で enforce（DB CHECK では強制困難）

### 1.2 API（`/api/user/collections`）

既存の `apps/server/src/routes/user/album-requests.ts` をテンプレートとして以下を実装:

```text
GET    /api/user/collections                      自分のコレクション一覧（paged）
POST   /api/user/collections                      新規作成
GET    /api/user/collections/:id                  詳細＋アイテム一覧（paged）
PATCH  /api/user/collections/:id                  名前/description/visibility 更新
DELETE /api/user/collections/:id                  削除（is_default_liked=true は不可）

POST   /api/user/collections/:id/items            アイテム追加（{target_type, target_id, note?}）
DELETE /api/user/collections/:id/items/:itemId    アイテム削除
PATCH  /api/user/collections/:id/items/reorder    並び替え（position 一括更新）

POST   /api/user/likes                            ♥ ショートカット: default_liked へ追加
                                                   （存在しなければ作成 + 追加）
DELETE /api/user/likes                            ♥ 解除: default_liked から削除
GET    /api/user/likes/check                      複数 target を一気にチェック
                                                   ?items=track:<id>,album:<id>,...
```

- 認証: 全ルートで `requireUserMiddleware` を使用
- バリデーション: zod スキーマ。`target_type` は discriminated union ではなく enum + ゲートウェイ層で対象 ID 存在検証
- エラー処理: 既存の `handleDbError()` を踏襲。重複追加 (23505) は 409、対象不存在は 404
- レート制限: `methodRateLimiter`（既存）

**公開エンドポイント（Phase 2 で本格化、Phase 1 でも準備）**:

```text
GET    /api/public/collections/:short_id          unlisted/public な閲覧用
                                                   ※ private なら 404 を返す
```

### 1.3 Web UI

```text
/user/_user.tsx
├ サイドバーに以下を追加:
│   └ 「コレクション」 → /user/collections
│
/user/collections/index.tsx                       一覧（カード式、可視性バッジ付き）
/user/collections/$id.tsx                         詳細・編集・アイテム CRUD
/user/collections/new.tsx                         新規作成フォーム

/user/likes.tsx                                   default_liked のショートカット表示
                                                   実体は /user/collections/<liked-id> へ転送
```

各楽曲・アルバム・サークルの**詳細ページ**に追加する UI:

- ♥ボタン（default_liked へ追加 / 解除）。未ログイン時は /login へ誘導
- 「コレクションに追加」ドロップダウン（既存コレクション一覧 + 新規作成）

実装には既存の TanStack Query パターン (`apps/web/src/lib/query-options.ts`) と daisyUI v5 の `card` / `badge` / `dropdown` / `modal` を踏襲。

### 1.4 検証

- [ ] 未ログインで♥ボタン押下 → /login へリダイレクト、戻ったら追加完了
- [ ] 同一 target を二重追加 → 409 で UI エラー表示
- [ ] is_default_liked = true のコレクションは削除 API で 403
- [ ] 100 件超のコレクション作成試行 → 422
- [ ] 1000 件超のアイテム追加試行 → 422
- [ ] /user/likes/check でカード一覧の♥状態を一括チェック → N+1 が出ない

---

## 2. Phase 2: プレイリスト + SNS 共有

### 2.1 データモデル拡張

Phase 1 のテーブルをそのまま使用。`kind = 'playlist'` で追加制約を **アプリ層** で enforce:

- `user_collection_items.target_type` は `'track'` のみ許可
- `user_collection_items.position` は NOT NULL
- `ordered` は true 固定
- `short_id` は visibility が unlisted/public になった時点で **必ず採番**（nanoid 8文字）

スキーマ自体の変更はなし（同テーブル拡張で OK）。CHECK 制約は kind 別の細かい制約を入れにくいため、アプリ層責務とする（既存 album_requests の discriminated union と同じ哲学）。

新規テーブル:

```text
user_collection_views
├ collection_id  uuid (fk)
├ viewed_date    date         ★ 日次粒度、UTC基準
├ view_count     integer not null
PRIMARY KEY (collection_id, viewed_date)
INDEX (collection_id)         ★ 累計集計用
```

公開プレイリストの閲覧数を日次で集計し、人気順表示・統計用に使う。bot 除外は user-agent ベースで簡易的に。

### 2.2 API

```text
GET    /api/user/playlists                        kind=playlist のみフィルタした自分の一覧
                                                   ※ /api/user/collections?kind=playlist と等価
POST   /api/user/playlists                        新規（kind=playlist 強制 + ordered=true）
PATCH  /api/user/playlists/:id/visibility         ★ unlisted/public へ変更時に short_id 採番
PATCH  /api/user/playlists/:id/items/reorder      drag&drop 並び替え（position 一括）

GET    /api/public/playlists                      公開プレイリスト一覧（人気順/新着順）
GET    /api/public/playlists/:short_id            公開プレイリスト詳細
                                                   visibility=private なら 404
                                                   閲覧時 user_collection_views を増分
```

> ⚠️ `GET /api/public/playlists/:short_id/og.png`（動的OG画像エンドポイント）は **Phase 2 初版実装スコープ外**。設計だけ 2.3.2 に記録し、実装着手時に再評価する。

### 2.3 OG 画像戦略

#### 2.3.1 初版実装（採用）── 静的 OG 画像 + 動的メタ

Phase 2 初版では **動的画像生成は行わず、サイト共通の静的 OG 画像** を使用する。OG メタタグの `og:title` / `og:description` / `og:url` のみを公開プレイリスト毎に動的生成し、SNS カードには「タイトル + 説明文 + サイト共通カバー画像」を表示させる。

- `og:image`: `https://<host>/og-default.png`（プレイリスト用に作る共通画像、1200×630）
- `og:title`: プレイリスト名 + 「| 東方編曲録」
- `og:description`: 「<作成者名> の公開プレイリスト ・ 全 N 曲」 + プレイリスト description 先頭 100 文字
- `og:type`: `music.playlist`（または `website` フォールバック）
- `twitter:card`: `summary_large_image`

実装は既存 `apps/web/src/lib/head.ts` の拡張で完結する。バンドルサイズ・サーバー処理コスト・フォントライセンスの追加負担なし。

#### 2.3.2 将来実装（記録のみ）── 動的 OG 画像生成

> **本仕様書ではスコープ外。将来「ジャケットモザイク入りのリッチカードを作りたい」となった時に着手する。設計判断を残すための記録**。

- 技術選定候補: **satori (HTML → SVG) + @resvg/resvg-js (SVG → PNG)** を Hono ルートに実装。Node.js ランタイム前提（`@vercel/og` 自体は Edge Runtime 依存のため不可、satori 単体採用）
- 想定エンドポイント: `GET /api/public/playlists/:short_id/og.png`
- 想定仕様:
  - 1200×630px、PNG
  - 上部: プレイリストタイトル（最大 2 行、Noto Sans JP）
  - 中央: 含まれるトラックのアルバムジャケットを 2×2 のモザイクで配置（4 件未満時は 1×1 / 2×1）
  - 下部: 「by @<username>」 + thac ロゴ
  - ジャケット未取得トラックがある場合は単色プレースホルダー
- 想定キャッシュ:
  - レスポンスヘッダー `Cache-Control: public, max-age=3600, s-maxage=86400`
  - `ETag` をプレイリスト updated_at + items の最終更新で計算
  - 内容変更時は短期キャッシュで自然失効
- 失敗時フォールバック: 静的デフォルト OG 画像（2.3.1 と同じ）
- 着手時に再評価する事項:
  - Noto Sans JP のサブセット化（フォントバンドル軽量化）
  - satori が `<img>` 経由でのアルバムジャケット読み込みに耐えるか（CDN 経由・タイムアウト・並列数）
  - 同人音楽のジャケット画像配信元の robots/利用規約と OG 画像転載の整合
  - Hono + Node.js + satori の実装事例調査（執筆時点で薄い領域）
- 移行手順（着手時）:
  1. `packages/og-image/` パッケージ新設、satori + resvg を依存に追加
  2. `apps/server/src/routes/public/playlist-og.ts` 新設し `og.png` ルート公開
  3. `apps/web/src/lib/head.ts` で `og:image` を動的 URL に切替
  4. SNS デバッガ（X Card Validator, Bluesky preview, Facebook Sharing Debugger）で実画像確認

### 2.4 SNS 共有 UI

公開プレイリスト詳細ページ (`/p/<short_id>`) と作成者向け管理画面に、**5 種類の共有手段**を提供する `<ShareButtons>` コンポーネントを新規作成:

```
[X (Twitter)] [Bluesky] [Misskey] [Threads] [URL コピー]
```

| プラットフォーム | URL パターン | 備考 |
|---|---|---|
| X | `https://twitter.com/intent/tweet?url=<URL>&text=<TITLE>` | text に楽曲数も含める |
| Bluesky | `https://bsky.app/intent/compose?text=<TITLE>%20<URL>` | composer intent |
| Misskey | `https://misskey.io/share?url=<URL>&text=<TITLE>` | misskey.io 既定（将来サーバー選択UI追加検討） |
| Threads | `https://threads.net/intent/post?text=<TITLE>%20<URL>` | text only intent |
| URL コピー | `navigator.clipboard.writeText(...)` + トースト表示 | Web Share API 利用可なら優先 |

モバイルでは `navigator.share()` (Web Share API) があれば「共有」単一ボタンに統合する。

### 2.5 Web UI

```text
/user/_user.tsx サイドバー追加: 「プレイリスト」 → /user/playlists

/user/playlists/index.tsx          自分のプレイリスト一覧（visibility別フィルタ）
/user/playlists/$id.tsx            編集・並び替え（@dnd-kit 等）
/user/playlists/new.tsx            新規作成

/_public/playlists.tsx             公開プレイリスト一覧（人気・新着・タグ別）
/_public/p.$shortId.tsx            公開詳細（再生 UI なし、トラック一覧表示のみ）
                                    └ ShareButtons
                                    └ OGメタタグ（静的画像 + 動的タイトル/説明）
                                       ※ 動的OG画像は将来導入（2.3.2 参照）
                                    └ 閲覧時に view_count++ API 呼び出し
```

サイトマップ:

- `/sitemap-playlists.xml` を Hono ルートで動的生成
- `visibility = 'public'` のもののみ含める（unlisted は含めない）
- `lastmod` は `updated_at`、`changefreq=weekly`

### 2.6 Meilisearch インデックス（オプション、Phase 2 末）

公開プレイリストを検索可能にするか:

- 公開プレイリストには「タイトル」「説明」「作成者名」「含まれるトラックの曲名/原曲名」などが含まれる
- 既存の tracks インデックスと別に `playlists` インデックスを追加
- 同人音楽コミュニティには「特定原曲のアレンジ集」「特定サークル特集」のようなプレイリストが多く生まれると想定 → 検索ニーズあり

**判断**: Phase 2 のコア機能（公開・共有）が安定した後の拡張機能として準備し、初版リリースには含めない。本仕様書では「検討項目」として明記。

### 2.7 検証

- [ ] private → public へ変更すると short_id が生成され `/p/<short_id>` でアクセス可
- [ ] private なプレイリストの URL を直接叩いても 404
- [ ] OG メタタグ（title/description/url）が公開プレイリスト毎に動的生成され、X / Bluesky のカードプレビューにタイトル・説明が反映される
- [ ] og:image は静的共通画像 (`/og-default.png`) が表示される
- [ ] sitemap-playlists.xml が public プレイリストのみ含む
- [ ] 並び替えで position が連番で再採番
- [ ] track 以外を追加しようとすると 422

---

## 3. Phase 3: ユーザー統計 + プレイリスト統計

### 3.1 /user/statistics（個人ダッシュボード）

```text
┌─────────────────────────────────────────────────────────────┐
│ ようこそ、<username> さん                                       │
└─────────────────────────────────────────────────────────────┘
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Liked        │ プレイリスト │ 保存トラック │ カバー原曲数 │
│ ❤️ 245       │ 📜 12        │ 🎵 1,234     │ 🎼 89        │
└──────────────┴──────────────┴──────────────┴──────────────┘
┌─────────────────────────────────────────────────────────────┐
│ あなたが好きなジャンル分布（円グラフ）                          │
│   - サイト平均との偏差表示（"アレンジ系を全体より x% 多く保存"）│
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ お気に入り原曲ランキング Top 20                                 │
│   1. 〇〇 (32 トラック保存) ← 詳細リンク                       │
│   2. ...                                                       │
└─────────────────────────────────────────────────────────────┘
┌──────────────────┬──────────────────┬──────────────────────┐
│ サークル傾向 Top10│ アーティスト Top10│ イベント別保存数      │
└──────────────────┴──────────────────┴──────────────────────┘
```

- 集計ロジックは `apps/server/src/routes/user/stats.ts` に新設
- 既存の `apps/web/src/components/public/work-stats-section.tsx` を以下のように拡張:
  - props に `entityType: 'site' | 'user'` と `entityId?: string` を追加
  - `entityType='user'` の場合は user_id でフィルタした集計クエリを呼ぶ
- サイト平均との偏差は **集計済みサイト統計をキャッシュ** (5 分 TTL) して取得し、ユーザー統計と差分計算

### 3.2 /p/<short_id> 公開プレイリスト固有の統計

公開プレイリスト詳細ページの下部に追加:

```
このプレイリストの傾向
─────────────────────
原曲分布（円グラフ）        サークル分布（横棒グラフ）
────────────                ────────────
- 上海紅茶館  35%           - サークルA  12 曲
- ナイト・オブ・ナイツ 22%  - サークルB  8 曲
- ...                       - ...

総曲数 / 平均年代 / 含まれる原曲ユニーク数
```

集計クエリは tracks 経由で trackOfficialSongs / trackCredits / circles を JOIN。`/api/public/playlists/:short_id/stats` として提供。

### 3.3 検証

- [ ] /user/statistics でカード値が DB と一致
- [ ] サイト平均との偏差が正しく計算され、UI に "+x%" / "-x%" で表示
- [ ] 公開プレイリストページで再生せずに統計が表示
- [ ] 統計集計クエリが N+1 にならない（EXPLAIN で確認）

---

## 4. 横断設計事項

### 4.1 認証・認可

| ルート | ミドルウェア | 備考 |
|---|---|---|
| `/api/user/*` | `requireUserMiddleware` | 既存パターン踏襲 |
| `/api/public/playlists/*`, `/api/public/collections/:short_id` | `optionalAuthMiddleware` | 公開だが認証時は own/edit 権限を判定 |
| `/api/admin/playlists/*` (モデレーション) | `adminAuthMiddleware` | スパム対応 |

### 4.2 削除時の cascade と論理参照クリーンアップ

- `user.id` 削除 → `user_collections` (cascade) → `user_collection_items` (cascade)
- `tracks.id` / `releases.id` / `circles.id` 削除時: 通常運用では削除しない（マスタは保護）。万一削除する場合は **削除前にバッチで `user_collection_items` の該当行を削除する管理者ジョブ** を用意（`/api/admin/cleanup-orphan-items`）
- 取得時は LEFT JOIN で対象不存在ならフロントで「削除されたエンティティ」の placeholder を表示

### 4.3 スパム・モデレーション

- 公開プレイリスト・コレクションのみ対象
- レポートテーブル `content_reports` を新設:

```
content_reports
├ id, reporter_user_id (nullable for anonymous), target_type, target_id
├ reason (enum: spam/illegal/copyright/other), comment
├ status (enum: pending/reviewed/dismissed)
└ created_at, reviewed_at, reviewed_by_user_id
```

- 管理画面 `/admin/_admin/reports` でレビュー
- 違反プレイリストは visibility を強制 private 化 + ユーザー通知

### 4.4 レート制限・リソース制約

- API: 既存 `methodRateLimiter` 踏襲
- 上限:
  - ユーザー毎の最大コレクション数 100、最大プレイリスト数 100
  - 1 コレクション/プレイリスト内のアイテム数 1000
  - プレイリスト name 100 文字、description 500 文字、note 280 文字
  - 公開プレイリスト 1 アカウントあたり 50 件まで（公開乱発防止）

### 4.5 通知

Phase 1〜3 では **通知システムは導入しない**（フォロー機能がスコープ外のため必要性が低い）。Phase 4 でフォロー導入時に検討。

### 4.6 国際化

既存サイト同様、日本語 UI のみ（`lang="ja"` 固定）。OG メタタグも日本語前提で生成。動的 OG 画像を将来実装する場合は日本語フォント（Noto Sans JP）のサブセット化が必要（2.3.2 参照）。

---

## 5. Phase 4 以降（スコープ外、将来検討）

以下は本仕様書で**詳細設計しない**。実装したくなった時点で個別に仕様策定する:

| 機能 | 概要 |
|---|---|
| レビュー/★評価 | track/album への 1-5 星 + 任意レビュー本文。スパム/モデレーション設計が大きい |
| フォロー & タイムライン | 他ユーザーをフォロー、公開アクティビティのフィード |
| コンプ進捗トラッカー | 「サークル全リリース聴破」「イベント全制覇」進捗可視化 |
| コラボ編集プレイリスト | 複数ユーザーで編集可能な共同プレイリスト |
| インポート/エクスポート | コレクション/プレイリストの CSV/JSON 入出力 |
| 自動タグ提案 | プレイリストの原曲分布から自動タグ生成 |
| Meilisearch playlists インデックス | 公開プレイリストの全文検索（Phase 2 末候補） |
| 動的 OG 画像生成 | プレイリストのジャケットモザイクをリアルタイム合成（設計は 2.3.2 に記録済） |

---

## 6. 実装時に変更・新設する主要ファイル（参考）

実装開始時、以下のパスを編集・新設する想定。Phase ごとに分割可。

### Phase 1
- 新設: `packages/db/src/schema/user-collection.ts`
- 新設: `packages/db/src/schema/user-collection.validation.ts`
- 新設: `apps/server/src/routes/user/collections.ts`
- 新設: `apps/server/src/routes/user/likes.ts`
- 編集: `apps/server/src/routes/user/index.ts` (ルート登録)
- 新設: `apps/web/src/routes/user/collections/index.tsx`
- 新設: `apps/web/src/routes/user/collections/$id.tsx`
- 新設: `apps/web/src/routes/user/collections/new.tsx`
- 編集: `apps/web/src/routes/user/_user.tsx` (サイドバー)
- 編集: 各エンティティ詳細ページ（♥ボタン追加）
  - `apps/web/src/routes/_public/tracks_.$id.tsx`
  - `apps/web/src/routes/_public/releases_.$id.tsx`
  - `apps/web/src/routes/_public/circles_.$id.tsx`
- 新設: `apps/web/src/components/user/like-button.tsx`
- 新設: `apps/web/src/components/user/add-to-collection-dropdown.tsx`
- 新設: `apps/web/src/lib/user-collections-query-options.ts`

### Phase 2
- 新設: `apps/server/src/routes/user/playlists.ts`
- 新設: `apps/server/src/routes/public/playlists.ts`
- 新設: `apps/server/src/routes/public/sitemap-playlists.ts`
- 新設: `apps/web/src/routes/user/playlists/index.tsx`
- 新設: `apps/web/src/routes/user/playlists/$id.tsx`
- 新設: `apps/web/src/routes/_public/playlists.tsx`
- 新設: `apps/web/src/routes/_public/p.$shortId.tsx`
- 新設: `apps/web/src/components/share-buttons.tsx`
- 新設: `apps/web/public/og-default.png` (公開プレイリスト用静的 OG 画像)
- 編集: `apps/web/src/lib/head.ts` (公開プレイリスト用 OG メタ - 静的画像 + 動的 title/desc)
- 将来実装: `apps/server/src/routes/public/playlist-og.ts`（動的 OG、2.3.2 参照）
- 将来実装: `packages/og-image/`（satori + resvg 包含、2.3.2 参照）

### Phase 3
- 新設: `apps/server/src/routes/user/stats.ts`
- 新設: `apps/server/src/routes/public/playlist-stats.ts`
- 新設: `apps/web/src/routes/user/statistics.tsx`
- 編集: `apps/web/src/components/public/work-stats-section.tsx` (entityType prop)
- 編集: `apps/web/src/routes/_public/p.$shortId.tsx` (統計ブロック)

### 横断
- 新設: `packages/db/src/schema/content-report.ts`
- 新設: `apps/server/src/routes/admin/reports.ts`
- 新設: `apps/web/src/routes/admin/_admin/reports.tsx`

---

## 7. 参考: 再利用する既存ファイル

| ファイル | 再利用ポイント |
|---|---|
| `apps/server/src/middleware/user-auth.ts` | `requireUserMiddleware` |
| `apps/server/src/routes/user/album-requests.ts` | ユーザー API のテンプレート |
| `apps/server/src/utils/api-error.ts` | `handleDbError()` |
| `packages/db/src/schema/album-request.ts` | ユーザー紐付けテーブル設計サンプル |
| `apps/web/src/routes/user/_user.tsx` | ユーザーゾーンレイアウト |
| `apps/web/src/components/public/work-stats-section.tsx` | Nivo 統計コンポーネント（拡張対象） |
| `apps/web/src/lib/head.ts` | OG/SEO メタタグ生成 |
| `apps/web/src/lib/api-client.ts` | fetchWithAuth, SSR fetcher |
| `packages/search/` | Meilisearch クライアント（Phase 2 末で playlists インデックス追加検討） |

---

## 8. 検証（spec 全体としての end-to-end）

実装完了後の golden path 検証シナリオ:

1. **未ログイン**: トップ → 楽曲詳細 → ♥ クリック → /login へ誘導
2. **ログイン後**:
   - トップ → 楽曲詳細 → ♥ クリック → トースト「Liked に追加」
   - /user/collections → Liked が自動作成され、追加した楽曲が見える
   - 新規コレクション作成「夏コミ買うリスト」 → サークル/アルバム/楽曲を混在追加
3. **プレイリスト**:
   - /user/playlists/new → 「ナイト・オブ・ナイツ アレンジ集」を public で作成
   - 楽曲を 4 つ追加して並び替え
   - 公開 URL `/p/<short_id>` を表示し、X 共有ボタンを押す → twitter.com の compose に飛ぶ
   - X のカードプレビューにタイトル・説明文・サイト共通 OG 画像が表示される
     ※ ジャケットモザイクの動的 OG 画像は本仕様では未実装（2.3.2 に設計記録のみ）
4. **統計**:
   - /user/statistics で自分の傾向が表示される
   - サイト平均との偏差が表示される
   - /p/<short_id> 下部にこのプレイリストの原曲分布円グラフが表示される
5. **モデレーション（admin）**:
   - 一般ユーザーが公開プレイリストを report
   - admin が /admin/reports でレビューし、強制 private 化

---

## 9. 既知のリスク・運用前提

- ⚠️ `user_collection_items.target_id` の論理参照は admin cleanup ジョブ任せ。**通常運用ではマスタ（tracks/releases/circles）を物理削除しない**方針が前提（運用ドキュメントへの明記が必要）
- ⚠️ 動的 OG 画像を将来実装する場合（2.3.2）、Noto Sans JP のサブセット化＋フォントライセンス確認、satori が CDN 経由ジャケット画像読み込みに耐えるかの検証が必要

# コンポーネント設計

> 公開ページで使用する共通コンポーネントの仕様

## 目次

1. [レイアウトコンポーネント](#レイアウトコンポーネント)
2. [ナビゲーションコンポーネント](#ナビゲーションコンポーネント)
3. [表示制御コンポーネント](#表示制御コンポーネント)
4. [データ表示コンポーネント](#データ表示コンポーネント)
5. [フィルターコンポーネント](#フィルターコンポーネント)
6. [フィードバックコンポーネント](#フィードバックコンポーネント)

---

## レイアウトコンポーネント

### PublicLayout

公開ページの共通レイアウト。

**ファイル:** `apps/web/src/routes/_public.tsx`

**構成:**
```tsx
<div className="min-h-screen flex flex-col">
  <PublicHeader />
  <main className="flex-1 container mx-auto px-4 py-6">
    <PublicBreadcrumb />
    <Outlet />
  </main>
  <PublicFooter />
</div>
```

**Props:** なし（TanStack Routerのレイアウトルート）

---

### PublicHeader

サイトヘッダー。

**ファイル:** `apps/web/src/components/public/public-header.tsx`

**機能:**
- ロゴ（ホームへのリンク）
- メインナビゲーション
- 検索アイコン
- テーマ切替
- ユーザーメニュー
- モバイルドロワー

**状態:**
- `isDrawerOpen: boolean` - モバイルドロワーの開閉
- `isSearchOpen: boolean` - 検索オーバーレイの開閉

**デスクトップ表示:**
```
[Logo] | Nav1 Nav2 Nav3 Nav4 Nav5 | [🔍] [🌙] [👤]
```

**モバイル表示:**
```
[≡] [Logo]                         [🔍] [🌙] [👤]
```

---

### PublicFooter

サイトフッター。

**ファイル:** `apps/web/src/components/public/public-footer.tsx`

**構成:**
- サイト名
- リンク（About, Privacy, Terms）
- コピーライト

**Props:** なし

---

## ナビゲーションコンポーネント

### PublicBreadcrumb

パンくずリスト。

**ファイル:** `apps/web/src/components/public/public-breadcrumb.tsx`

**機能:**
- 現在地の表示
- 階層ナビゲーション
- モバイル折りたたみ

**Props:**
```typescript
interface BreadcrumbItem {
  label: string;
  href?: string; // undefinedの場合は現在地（リンクなし）
}

interface PublicBreadcrumbProps {
  items: BreadcrumbItem[];
}
```

**使用例:**
```tsx
<PublicBreadcrumb
  items={[
    { label: "ホーム", href: "/" },
    { label: "アーティスト", href: "/artists" },
    { label: "Artist Name" }, // 現在地
  ]}
/>
```

**出力:**
```
ホーム > アーティスト > Artist Name
```

---

### SearchBar

検索バー。

**ファイル:** `apps/web/src/components/public/search-bar.tsx`

**機能:**
- テキスト入力
- デバウンス処理（300ms）
- 検索履歴表示
- クリアボタン

**Props:**
```typescript
interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  showHistory?: boolean;
  autoFocus?: boolean;
}
```

**使用例:**
```tsx
<SearchBar
  placeholder="アーティスト、曲名、サークル名で検索..."
  onSearch={(query) => router.navigate({ to: "/search", search: { q: query } })}
  showHistory
/>
```

---

## 表示制御コンポーネント

### ViewToggle

グリッド/リスト表示切替。

**ファイル:** `apps/web/src/components/public/view-toggle.tsx`

**機能:**
- グリッド/リスト切替ボタン
- 状態をlocalStorageに保存
- lucide-reactアイコン使用

**Props:**
```typescript
type ViewMode = "grid" | "list";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  storageKey?: string; // localStorage用キー
}
```

**使用例:**
```tsx
const [viewMode, setViewMode] = useState<ViewMode>("grid");

<ViewToggle
  value={viewMode}
  onChange={setViewMode}
  storageKey="artists-view-mode"
/>
```

**アイコン:**
```tsx
import { LayoutGrid, List } from "lucide-react";

// グリッド: <LayoutGrid className="size-5" />
// リスト: <List className="size-5" />
```

---

### EventViewToggle

イベント表示切替（シリーズ別/年別）。

**ファイル:** `apps/web/src/components/public/event-view-toggle.tsx`

**機能:**
- シリーズ別/年別の切替
- URL同期

**Props:**
```typescript
type EventViewMode = "series" | "year";

interface EventViewToggleProps {
  value: EventViewMode;
  onChange: (mode: EventViewMode) => void;
}
```

**使用例:**
```tsx
<EventViewToggle
  value={viewMode}
  onChange={setViewMode}
/>
```

---

### TabView

タブ切替。

**ファイル:** `apps/web/src/components/public/tab-view.tsx`

**機能:**
- タブナビゲーション
- コンテンツ切替
- スムーズなトランジション
- モバイルスワイプ対応

**Props:**
```typescript
interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  count?: number; // バッジ表示用
}

interface TabViewProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}
```

**使用例:**
```tsx
<TabView
  tabs={[
    { id: "releases", label: "リリース一覧", content: <ReleaseList />, count: 45 },
    { id: "tracks", label: "曲一覧", content: <TrackList />, count: 678 },
  ]}
  defaultTab="releases"
/>
```

---

## データ表示コンポーネント

### EntityCard

エンティティカード（グリッド表示用）。

**ファイル:** `apps/web/src/components/public/entity-card.tsx`

**機能:**
- 画像/アバター表示
- タイトル、サブタイトル
- バッジ表示
- ホバーエフェクト
- プリフェッチ

**Props:**
```typescript
interface EntityCardProps {
  href: string;
  image?: string;
  title: string;
  subtitle?: string;
  badges?: Array<{
    label: string;
    variant: "primary" | "secondary" | "accent";
  }>;
  meta?: string; // 例: "123曲"
}
```

**使用例:**
```tsx
<EntityCard
  href="/artists/123"
  title="Artist Name"
  badges={[
    { label: "編曲", variant: "primary" },
    { label: "Vo", variant: "accent" },
  ]}
  meta="123曲"
/>
```

---

### EntityList

エンティティリスト（リスト表示用）。

**ファイル:** `apps/web/src/components/public/entity-list.tsx`

**機能:**
- テーブル形式の表示
- カラムカスタマイズ
- ソート対応
- リンク行

**Props:**
```typescript
interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface EntityListProps<T> {
  items: T[];
  columns: Column<T>[];
  getHref: (item: T) => string;
  emptyMessage?: string;
}
```

**使用例:**
```tsx
<EntityList
  items={artists}
  columns={[
    { key: "name", header: "名前", render: (a) => a.name },
    { key: "roles", header: "役割", render: (a) => <RoleBadges roles={a.roles} /> },
    { key: "trackCount", header: "曲数", render: (a) => `${a.trackCount}曲` },
  ]}
  getHref={(a) => `/artists/${a.id}`}
/>
```

---

### StatsCard

統計カード。

**ファイル:** `apps/web/src/components/public/stats-card.tsx`

**機能:**
- 数値表示
- ラベル
- アイコン
- カウントアップアニメーション
- クリック可能（リンク先あり）

**Props:**
```typescript
interface StatsCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  href?: string;
  animate?: boolean; // カウントアップアニメーション
}
```

**使用例:**
```tsx
import { Music, Users } from "lucide-react";

<StatsCard
  icon={<Music className="size-6" />}
  value={1234}
  label="原曲"
  href="/original-songs"
  animate
/>
```

---

### HeroSection

ヒーローセクション（トップページ用）。

**ファイル:** `apps/web/src/components/public/hero-section.tsx`

**機能:**
- サイト名表示
- 検索バー
- 背景グラデーション

**Props:**
```typescript
interface HeroSectionProps {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
}
```

---

### RoleBadge

役割バッジ。

**ファイル:** `apps/web/src/components/public/role-badge.tsx`

**機能:**
- 役割の視覚的表示
- 色分け

**Props:**
```typescript
type RoleType = "arranger" | "lyricist" | "vocalist" | "composer" | "other";

interface RoleBadgeProps {
  role: RoleType;
  size?: "sm" | "md";
}
```

**色定義:**

| 役割 | 表示 | daisyUIクラス |
|------|------|--------------|
| arranger | 編曲 | `badge-primary` |
| lyricist | 作詞 | `badge-secondary` |
| vocalist | Vo | `badge-accent` |
| composer | 作曲 | `badge-info` |
| other | その他 | `badge-ghost` |

---

## フィルターコンポーネント

### ScriptFilter

文字種フィルター（サークル/アーティスト用）。

**ファイル:** `apps/web/src/components/public/script-filter.tsx`

**機能:**
- 文字種カテゴリ選択
- URL同期
- 複数選択可能

**Props:**
```typescript
type ScriptCategory = "symbol" | "alphabet" | "kana" | "kanji" | "all";

interface ScriptFilterProps {
  value: ScriptCategory;
  onChange: (category: ScriptCategory) => void;
}
```

**カテゴリ定義:**

| カテゴリ | ラベル | 対象 |
|----------|--------|------|
| all | すべて | 全件 |
| symbol | 記号・数字 | `0-9`, 記号 |
| alphabet | 英字 | `A-Z`, `a-z` |
| kana | かな | ひらがな、カタカナ |
| kanji | 漢字 | CJK統合漢字 |

**使用例:**
```tsx
<ScriptFilter
  value={scriptFilter}
  onChange={(category) => {
    setScriptFilter(category);
    router.navigate({
      search: { script: category === "all" ? undefined : category },
    });
  }}
/>
```

---

### RoleFilter

役割フィルター（アーティスト用）。

**ファイル:** `apps/web/src/components/public/role-filter.tsx`

**機能:**
- 役割カテゴリ選択
- URL同期

**Props:**
```typescript
type RoleCategory = "all" | "arranger" | "lyricist" | "vocalist";

interface RoleFilterProps {
  value: RoleCategory;
  onChange: (role: RoleCategory) => void;
}
```

**使用例:**
```tsx
<RoleFilter
  value={roleFilter}
  onChange={(role) => {
    setRoleFilter(role);
    router.navigate({
      search: { role: role === "all" ? undefined : role },
    });
  }}
/>
```

---

## フィードバックコンポーネント

### Skeleton

スケルトンローディング。

**ファイル:** `apps/web/src/components/public/skeleton.tsx`

**バリエーション:**
- `SkeletonCard` - カード用
- `SkeletonList` - リスト用
- `SkeletonText` - テキスト用
- `SkeletonAvatar` - アバター用

**Props:**
```typescript
interface SkeletonProps {
  className?: string;
}

interface SkeletonCardProps {
  count?: number; // 表示個数
}

interface SkeletonListProps {
  rows?: number; // 行数
  columns?: number; // 列数
}
```

**使用例:**
```tsx
// カードグリッド
<SkeletonCard count={8} />

// テーブル
<SkeletonList rows={5} columns={4} />
```

---

### EmptyState

空状態表示。

**ファイル:** `apps/web/src/components/public/empty-state.tsx`

**機能:**
- イラスト/アイコン
- メッセージ
- アクションボタン

**Props:**
```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**使用例:**
```tsx
<EmptyState
  icon={<SearchX className="size-12" />}
  title="検索結果がありません"
  description="「東方紅魔郷」に一致する結果は見つかりませんでした"
  action={{
    label: "検索をクリア",
    onClick: () => clearSearch(),
  }}
/>
```

---

### ErrorState

エラー状態表示。

**ファイル:** `apps/web/src/components/public/error-state.tsx`

**機能:**
- エラーメッセージ
- 再試行ボタン

**Props:**
```typescript
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}
```

**使用例:**
```tsx
<ErrorState
  title="データの取得に失敗しました"
  message="ネットワーク接続を確認してください"
  onRetry={() => refetch()}
/>
```

---

## コンポーネントファイル構造

```
apps/web/src/components/public/
├── public-header.tsx       # ヘッダー
├── public-footer.tsx       # フッター
├── public-breadcrumb.tsx   # パンくずリスト
├── search-bar.tsx          # 検索バー
├── hero-section.tsx        # ヒーローセクション
├── stats-card.tsx          # 統計カード
├── view-toggle.tsx         # グリッド/リスト切替
├── event-view-toggle.tsx   # イベント表示切替
├── tab-view.tsx            # タブ切替
├── entity-card.tsx         # エンティティカード
├── entity-list.tsx         # エンティティリスト
├── script-filter.tsx       # 文字種フィルター
├── role-filter.tsx         # 役割フィルター
├── role-badge.tsx          # 役割バッジ
├── skeleton.tsx            # スケルトンローディング
├── empty-state.tsx         # 空状態
└── error-state.tsx         # エラー状態
```

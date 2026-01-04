# 技術スタック

> 公開ページ実装に使用する技術とライブラリ

## 目次

1. [コア技術](#コア技術)
2. [UIライブラリ](#uiライブラリ)
3. [状態管理・データ取得](#状態管理データ取得)
4. [検索](#検索)
5. [実装パターン](#実装パターン)
6. [ファイル構造](#ファイル構造)

---

## コア技術

### ルーティング

| 項目 | 技術 |
|------|------|
| ライブラリ | TanStack Router |
| 方式 | ファイルベースルーティング |
| SSR | TanStack Start |

**ルートファイル命名規則:**
```
routes/
├── _public.tsx              # レイアウトルート（アンダースコアプレフィックス）
└── _public/
    ├── index.tsx            # /
    ├── about.tsx            # /about
    ├── artists.tsx          # /artists
    └── artists_.$id.tsx     # /artists/:id（ドット + $でパラメータ）
```

**プリフェッチ:**
```typescript
// リンクホバー時にプリロード
<Link to="/artists/$id" params={{ id }} preload="intent">
  {name}
</Link>
```

---

### スタイリング

| 項目 | 技術 |
|------|------|
| CSSフレームワーク | TailwindCSS v4 |
| コンポーネントライブラリ | daisyUI v5 |
| アイコン | lucide-react |

**TailwindCSS v4 特徴:**
- CSS変数ベースのテーマ
- `@theme`ディレクティブによるカスタマイズ
- パフォーマンス向上

**daisyUI v5 使用例:**
```tsx
// ボタン
<button className="btn btn-primary">Primary</button>

// カード
<div className="card bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Title</h2>
  </div>
</div>

// バッジ
<span className="badge badge-primary">編曲</span>
<span className="badge badge-secondary">作詞</span>
<span className="badge badge-accent">Vo</span>

// タブ
<div className="tabs tabs-boxed">
  <a className="tab tab-active">Tab 1</a>
  <a className="tab">Tab 2</a>
</div>
```

---

### アイコン

**ライブラリ:** lucide-react

**使用例:**
```tsx
import {
  LayoutGrid,
  List,
  Search,
  Moon,
  Sun,
  Menu,
  X,
  ChevronRight,
  Music,
  Users,
  Calendar,
  Disc,
  Mic2,
} from "lucide-react";

// 表示切替
<LayoutGrid className="size-5" />  // グリッド
<List className="size-5" />        // リスト

// テーマ
<Moon className="size-5" />        // ダーク
<Sun className="size-5" />         // ライト

// ナビゲーション
<Menu className="size-6" />        // ハンバーガー
<X className="size-6" />           // 閉じる
<ChevronRight className="size-4" /> // パンくず区切り

// エンティティ
<Music className="size-6" />       // 原曲
<Users className="size-6" />       // アーティスト
<Calendar className="size-6" />    // イベント
<Disc className="size-6" />        // リリース
<Mic2 className="size-6" />        // ボーカル
```

---

## UIライブラリ

### daisyUI テーマ

```css
/* apps/web/src/styles.css */
@import "tailwindcss";
@plugin "daisyui" {
  themes: light --default, dark --prefersDark;
}
```

**テーマ切替:**
```tsx
// html要素のdata-theme属性で切替
<html data-theme="light">  // ライトテーマ
<html data-theme="dark">   // ダークテーマ
```

---

### コンポーネントマッピング

| 用途 | daisyUIクラス |
|------|--------------|
| プライマリボタン | `btn btn-primary` |
| ゴーストボタン | `btn btn-ghost` |
| カード | `card bg-base-100 shadow-xl` |
| 入力フィールド | `input input-bordered` |
| バッジ | `badge badge-{variant}` |
| タブ | `tabs tabs-boxed` |
| ドロワー | `drawer drawer-end` |
| モーダル | `modal` |
| スケルトン | `skeleton` |
| ブレッドクラム | `breadcrumbs` |

---

## 状態管理・データ取得

### TanStack Query

| 項目 | 設定 |
|------|------|
| ライブラリ | @tanstack/react-query |
| SSR対応 | TanStack Start統合 |
| キャッシュ | 5分（デフォルト） |

**データ取得パターン:**
```typescript
// apps/web/src/routes/_public/artists.tsx
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

const artistsQueryOptions = (params: { script?: string; role?: string }) =>
  queryOptions({
    queryKey: ["artists", params],
    queryFn: () => fetchArtists(params),
    staleTime: 5 * 60 * 1000, // 5分
  });

export const Route = createFileRoute("/_public/artists")({
  validateSearch: (search) => ({
    script: search.script as string | undefined,
    role: search.role as string | undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(artistsQueryOptions(deps)),
  component: ArtistsPage,
});

function ArtistsPage() {
  const search = Route.useSearch();
  const { data } = useSuspenseQuery(artistsQueryOptions(search));
  // ...
}
```

---

### ローカル状態

**localStorage保存:**
```typescript
// 表示モード（グリッド/リスト）
const VIEW_MODE_KEY = "thac:view-mode";

function useViewMode(key: string) {
  const [mode, setMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    return (localStorage.getItem(`${VIEW_MODE_KEY}:${key}`) as "grid" | "list") || "grid";
  });

  useEffect(() => {
    localStorage.setItem(`${VIEW_MODE_KEY}:${key}`, mode);
  }, [key, mode]);

  return [mode, setMode] as const;
}
```

**URL同期:**
```typescript
// フィルター状態をURLパラメータで管理
const search = Route.useSearch();
const navigate = Route.useNavigate();

// フィルター変更時
const handleFilterChange = (script: string) => {
  navigate({
    search: (prev) => ({ ...prev, script: script === "all" ? undefined : script }),
  });
};
```

---

## 検索

### Meilisearch

| 項目 | 設定 |
|------|------|
| エンジン | Meilisearch |
| クライアント | meilisearch-js |
| インデックス | artists, circles, tracks, original_songs |

**検索設定:**
```typescript
// インデックス設定
{
  "searchableAttributes": ["name", "aliases", "description"],
  "filterableAttributes": ["roles", "script_category"],
  "sortableAttributes": ["name", "track_count"],
  "typoTolerance": {
    "enabled": true,
    "minWordSizeForTypos": { "oneTypo": 3, "twoTypos": 6 }
  }
}
```

**日本語対応:**
- トークナイザー: `japanese`（形態素解析）
- 同義語設定（必要に応じて）

---

### 検索実装

```typescript
// apps/web/src/lib/search.ts
import { MeiliSearch } from "meilisearch";

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST!,
  apiKey: process.env.MEILISEARCH_API_KEY,
});

export async function searchAll(query: string) {
  const results = await client.multiSearch({
    queries: [
      { indexUid: "artists", q: query, limit: 10 },
      { indexUid: "circles", q: query, limit: 10 },
      { indexUid: "tracks", q: query, limit: 20 },
    ],
  });

  return {
    artists: results.results[0].hits,
    circles: results.results[1].hits,
    tracks: results.results[2].hits,
  };
}
```

---

## 実装パターン

### SSRデータフェッチ

```typescript
// ルートローダーでデータをプリフェッチ
export const Route = createFileRoute("/_public/artists/$id")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      artistDetailQueryOptions(params.id)
    );
  },
  component: ArtistDetailPage,
});

// コンポーネントでデータを使用
function ArtistDetailPage() {
  const { id } = Route.useParams();
  const { data: artist } = useSuspenseQuery(artistDetailQueryOptions(id));
  // ...
}
```

---

### スクロール復元

```typescript
// TanStack Routerの組み込み機能を使用
const router = createRouter({
  scrollRestoration: true,
});
```

---

### プリフェッチ

```typescript
// リンクホバー時
<Link
  to="/artists/$id"
  params={{ id: artist.id }}
  preload="intent"
>
  {artist.name}
</Link>

// プログラマティック
const router = useRouter();
const handleMouseEnter = (id: string) => {
  router.preloadRoute({ to: "/artists/$id", params: { id } });
};
```

---

### View Transitions

```typescript
// TanStack Routerで有効化
const router = createRouter({
  defaultViewTransition: true,
});

// CSSでアニメーション定義
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

::view-transition-old(root) {
  animation: fade-out 150ms ease-out;
}

::view-transition-new(root) {
  animation: fade-in 150ms ease-in;
}
```

---

## ファイル構造

### ルートファイル

```
apps/web/src/routes/
├── __root.tsx                      # ルートレイアウト
├── _public.tsx                     # 公開レイアウト
└── _public/
    ├── index.tsx                   # トップページ
    ├── about.tsx                   # About
    ├── search.tsx                  # 検索
    ├── official-works.tsx          # 公式作品一覧
    ├── official-works_.$id.tsx     # 公式作品詳細
    ├── original-songs.tsx          # 公式曲一覧
    ├── original-songs_.$id.tsx     # 公式曲詳細
    ├── events.tsx                  # イベント一覧
    ├── events_.$id.tsx             # イベント詳細
    ├── circles.tsx                 # サークル一覧
    ├── circles_.$id.tsx            # サークル詳細
    ├── artists.tsx                 # アーティスト一覧
    ├── artists_.$id.tsx            # アーティスト詳細
    ├── roles.tsx                   # 役割一覧
    ├── roles_.$code.tsx            # 役割別アーティスト
    └── stats.tsx                   # 統計
```

---

### コンポーネントファイル

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

---

### API・ユーティリティ

```
apps/web/src/lib/
├── public-api.ts           # 公開API関数
├── search.ts               # Meilisearch連携
└── hooks/
    ├── use-view-mode.ts    # 表示モード管理
    └── use-script-filter.ts # フィルター管理
```

---

## 実装フェーズ

### Phase 1: 基盤構築
1. `_public.tsx` レイアウトルート
2. `public-header.tsx`
3. `public-footer.tsx`
4. `public-breadcrumb.tsx`
5. トップページ（`/`）

### Phase 2: 共通コンポーネント
6. `view-toggle.tsx`
7. `entity-card.tsx` / `entity-list.tsx`
8. `script-filter.tsx`
9. `event-view-toggle.tsx`
10. `tab-view.tsx`

### Phase 3: 公式作品・公式曲
11. 公式作品一覧
12. 公式作品詳細
13. 公式曲一覧
14. 公式曲詳細

### Phase 4: サークル・イベント
15. サークル一覧
16. サークル詳細
17. イベント一覧
18. イベント詳細

### Phase 5: アーティスト・役割
19. アーティスト一覧
20. アーティスト詳細
21. 役割一覧
22. 役割別アーティスト

### Phase 6: 追加ページ
23. Aboutページ
24. 統計ページ
25. 検索ページ

### Phase 7: API連携
26. 公開APIエンドポイント
27. Meilisearch連携
28. SSRデータフェッチ

### Phase 8: UX改善・ポリッシュ
29. スケルトンローディング
30. エラー・空状態UI
31. マイクロアニメーション
32. キーボードショートカット
33. スクロール復元
34. プリフェッチ
35. SEO対応（メタタグ、OGP）
36. アクセシビリティ確認

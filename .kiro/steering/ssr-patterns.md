# SSR Data Fetching Patterns

## 概要

TanStack Start + TanStack Queryを使用したSSRデータフェッチングパターン。
初回ページロード時のローディング表示を回避し、2回目以降はキャッシュを優先表示する。

## 推奨パターン: ensureQueryData + queryOptions

TanStack公式推奨のパターン。ローダーとコンポーネントで同じqueryOptionsを共有することで、
キャッシュの自動同期とコードの重複排除を実現する。

### queryOptionsファクトリの定義

`apps/web/src/lib/query-options.ts`に一元管理:

```typescript
import { queryOptions } from "@tanstack/react-query";
import { ssrFetch } from "@/functions/ssr-fetcher";

export const STALE_TIME = {
  SHORT: 30_000,   // 30秒 - 頻繁に変更されるデータ
  MEDIUM: 60_000,  // 1分 - マスターデータなど
  LONG: 300_000,   // 5分 - ほとんど変更されないデータ
} as const;

export const artistDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["artist", id],
    queryFn: () => ssrFetch<ArtistWithAliases>(`/api/admin/artists/${id}`),
    staleTime: STALE_TIME.SHORT,
  });
```

### ルートでの使用

```typescript
import { artistDetailQueryOptions } from "@/lib/query-options";

export const Route = createFileRoute("/admin/_admin/artists_/$id")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(artistDetailQueryOptions(params.id)),
  component: ArtistDetailPage,
});

function ArtistDetailPage() {
  const { id } = Route.useParams();
  // ローダーでプリフェッチしたデータを自動的に使用
  const { data, isPending, error } = useQuery(artistDetailQueryOptions(id));

  if (isPending && !data) {
    return <DetailPageSkeleton />;
  }
}
```

### メリット

1. **コードの重複排除**: queryKeyとqueryFnを1箇所で管理
2. **型安全**: 戻り値の型が自動推論される
3. **キャッシュ同期**: ローダーとコンポーネントで同じキャッシュを使用
4. **isInitialQuery不要**: ensureQueryDataがキャッシュを自動管理

## 従来パターン: ssrFetch + initialData

既存のルートで使用中。新規実装では上記の推奨パターンを使用すること。

### 基本構成

```typescript
import { ssrFetch } from "@/functions/ssr-fetcher";
import type { PaginatedResponse } from "@/lib/api-client";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export const Route = createFileRoute("/admin/_admin/example")({
  // SSRでデータを事前取得
  loader: () => ssrFetch<PaginatedResponse<Item>>(
    `/api/admin/items?page=${DEFAULT_PAGE}&limit=${DEFAULT_PAGE_SIZE}`
  ),
  component: Page,
});

function Page() {
  const loaderData = Route.useLoaderData();
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");

  // 初期クエリ状態かどうかを判定
  const isInitialQuery = page === DEFAULT_PAGE
    && pageSize === DEFAULT_PAGE_SIZE
    && !search;

  const { data, isPending, error } = useQuery({
    queryKey: ["items", page, pageSize, search],
    queryFn: () => api.list({ page, limit: pageSize, search }),
    staleTime: 30_000,
    // 初期状態のみSSRデータを使用
    initialData: isInitialQuery ? loaderData : undefined,
  });

  // キャッシュがあればスケルトンを表示しない
  {isPending && !data ? (
    <DataTableSkeleton rows={5} columns={6} />
  ) : (
    <Table>...</Table>
  )}
}
```

### ポイント

1. **`ssrFetch`**: サーバー側でCookieを転送してAPIを呼び出す
2. **`isInitialQuery`**: フィルター・ソート変更時はSSRデータを使わない
3. **`isPending && !data`**: キャッシュがあればローディング表示しない
4. **`staleTime`**: 30秒間は再フェッチしない

## 詳細ページのパターン

```typescript
export const Route = createFileRoute("/admin/_admin/items/$id")({
  loader: ({ params }) => ssrFetch<Item>(`/api/admin/items/${params.id}`),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const loaderData = Route.useLoaderData();

  const { data, isPending, error } = useQuery({
    queryKey: ["item", id],
    queryFn: () => api.get(id),
    staleTime: 30_000,
    initialData: loaderData,
  });

  if (isPending && !data) {
    return <DetailPageSkeleton cardCount={3} fieldsPerCard={6} />;
  }
}
```

## エラーハンドリング

### グローバルエラーコンポーネント

`apps/web/src/router.tsx`で設定:

```typescript
import { GlobalErrorComponent } from "./components/error-boundary";

export const getRouter = () => {
  const router = createTanStackRouter({
    // ...
    defaultErrorComponent: GlobalErrorComponent,
  });
};
```

### ルートレベルのエラーコンポーネント

特定のルートでカスタムエラーハンドリングが必要な場合:

```typescript
export const Route = createFileRoute("/admin/_admin/artists")({
  loader: () => ssrFetch(...),
  errorComponent: ({ error, reset }) => {
    if (error.message.includes("401")) {
      return <UnauthorizedError />;
    }
    return <ErrorComponent error={error} />;
  },
  component: ArtistsPage,
});
```

## SSRフェッチャーの機能

`apps/web/src/functions/ssr-fetcher.ts`:

### タイムアウト設定

- 詳細ページ: 5秒
- 一覧ページ（クエリパラメータあり）: 10秒

```typescript
const SSR_TIMEOUT = {
  DEFAULT: 5000,
  LIST: 10000,
} as const;
```

### パフォーマンス計測

各リクエストの実行時間を自動ログ出力:
- 1秒以内: info レベル
- 1秒超過: warn レベル

```
[SSR] /api/admin/artists?page=1&limit=20: 45.23ms
[SSR] /api/admin/tracks/xxx: 123.45ms
```

### SSRTimeoutError

タイムアウト時は専用のエラークラスをスロー:

```typescript
export class SSRTimeoutError extends Error {
  constructor(endpoint: string, timeout: number) {
    super(`SSR fetch timeout after ${timeout}ms: ${endpoint}`);
    this.name = "SSRTimeoutError";
  }
}
```

## スケルトンコンポーネント

### DataTableSkeleton

一覧ページ用。`apps/web/src/components/admin/data-table-skeleton.tsx`

```typescript
<DataTableSkeleton rows={5} columns={6} />
```

### DetailPageSkeleton

詳細ページ用。`apps/web/src/components/admin/detail-page-skeleton.tsx`

```typescript
<DetailPageSkeleton
  showBreadcrumb      // パンくず表示
  showHeader          // ヘッダー（戻るボタン + タイトル）表示
  showBadge           // バッジ表示
  cardCount={3}       // カード数
  fieldsPerCard={6}   // カード内フィールド数
/>
```

## isLoading vs isPending

- **React Query v5**: `isLoading` は非推奨、`isPending` を使用
- **キャッシュ優先**: `isPending && !data` でキャッシュがあれば即座に表示

## ルーターコンテキスト

`apps/web/src/routes/__root.tsx`で型定義:

```typescript
export type RouterAppContext = {
  queryClient: QueryClient;
};
```

`apps/web/src/router.tsx`でQueryClientを注入:

```typescript
export const getRouter = () => {
  const queryClient = getQueryClient();

  const router = createTanStackRouter({
    // ...
    context: {
      queryClient,
    },
  });
};
```

---
_Last updated: 2024-12_

# SSR Data Fetching Patterns

## 概要

TanStack Start + TanStack Queryを使用したSSRデータフェッチングパターン。
初回ページロード時のローディング表示を回避し、2回目以降はキャッシュを優先表示する。

## Stale-While-Revalidate パターン

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

## ssrFetch ヘルパー

`apps/web/src/functions/ssr-fetcher.ts`

```typescript
export async function ssrFetch<T>(path: string): Promise<T | undefined> {
  // サーバーサイドのみ実行
  // Cookieを転送してAPIを呼び出す
}
```

---
_Last updated: 2024-12_

# 管理画面デザインガイドライン

管理画面の統一的なデザインパターンとルールを定義する。

---

## ページレイアウト

### 一覧画面

```
┌─────────────────────────────────────────────────┐
│ パンくずナビゲーション（nav.breadcrumbs）          │
├─────────────────────────────────────────────────┤
│ h1 タイトル                                      │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ DataTableActionBar                          │ │
│ │ [検索] [フィルター]         [カラム] [新規] │ │
│ ├─────────────────────────────────────────────┤ │
│ │ エラー表示（該当時のみ）                      │ │
│ ├─────────────────────────────────────────────┤ │
│ │ Table（zebra）                              │ │
│ │ ID | 名前 | ... | アクション                │ │
│ │ ─────────────────────────────────────────── │ │
│ │ ...                                         │ │
│ ├─────────────────────────────────────────────┤ │
│ │ DataTablePagination                         │ │
│ │ 全100件中 1〜10件を表示  [<] 1 2 3 ... [>]  │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 詳細画面

```
┌─────────────────────────────────────────────────┐
│ パンくずナビゲーション（nav.breadcrumbs）          │
├─────────────────────────────────────────────────┤
│ [←] h1 タイトル [Badge]     [編集] [削除]       │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ 基本情報セクション                           │ │
│ │ ┌─────────────┐  ┌─────────────┐            │ │
│ │ │ ラベル: 値   │  │ ラベル: 値   │            │ │
│ │ └─────────────┘  └─────────────┘            │ │
│ ├─────────────────────────────────────────────┤ │
│ │ 関連データセクション（タブ or カード）        │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │ ネストされたテーブル                      │ │ │
│ │ │ + 追加ボタン                            │ │ │
│ │ └─────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### コンポーネント

| コンポーネント | 用途 |
|--------------|------|
| `nav.breadcrumbs` | daisyUIパンくずナビゲーション |
| `DataTableActionBar` | 検索、フィルター、カラム表示制御、新規作成ボタン |
| `Table` | データ一覧表示（zebraスタイル） |
| `DataTablePagination` | ページネーション、ページサイズ選択 |
| `DataTableSkeleton` | ローディング中のスケルトン表示 |
| `Dialog` | 新規作成・編集フォーム |

---

## ページタイトル

### document.title（ブラウザタブ）

#### 一覧画面

**形式**: `{エンティティ名} | 東方編曲録`

```typescript
// lib/head.ts
export function createPageHead(pageTitle?: string) {
  return {
    meta: [{ title: pageTitle ? `${pageTitle} | ${APP_NAME}` : APP_NAME }],
  };
}

// ルート定義
export const Route = createFileRoute("/admin/_admin/artists")({
  head: () => createPageHead("アーティスト"),
  component: ArtistsPage,
});
```

| ページ | pageTitle | document.title |
|--------|-----------|----------------|
| アーティスト一覧 | `アーティスト` | アーティスト \| 東方編曲録 |
| サークル一覧 | `サークル` | サークル \| 東方編曲録 |
| イベント一覧 | `イベント` | イベント \| 東方編曲録 |
| トラック一覧 | `トラック` | トラック \| 東方編曲録 |
| 作品一覧 | `作品` | 作品 \| 東方編曲録 |

#### 詳細画面

**形式**: `{画面種類}：{エンティティ名} | 東方編曲録`

```typescript
// 作品詳細
export function createReleaseDetailHead(releaseName?: string) {
  const subtitle = releaseName || "読み込み中";
  return {
    meta: [{ title: `作品詳細：${subtitle} | ${APP_NAME}` }],
  };
}

// トラック詳細（親エンティティ名も含む）
export function createTrackDetailHead(trackName?: string, releaseName?: string) {
  const subtitle = trackName && releaseName
    ? `${trackName} - ${releaseName}`
    : "読み込み中";
  return {
    meta: [{ title: `トラック詳細：${subtitle} | ${APP_NAME}` }],
  };
}

// ルート定義（loaderDataを使用）
export const Route = createFileRoute("/admin/_admin/releases_/$id")({
  loader: ({ params }) => releasesApi.get(params.id),
  head: ({ loaderData }) => createReleaseDetailHead(loaderData?.name),
  component: ReleaseDetailPage,
});
```

| ページ | document.title |
|--------|----------------|
| 作品詳細 | 作品詳細：{作品名} \| 東方編曲録 |
| トラック詳細 | トラック詳細：{トラック名} - {作品名} \| 東方編曲録 |

### パンくずナビゲーション（daisyUI breadcrumbs）

全画面でdaisyUI breadcrumbsパターンを使用する。

#### 一覧画面

```tsx
<div className="container mx-auto space-y-6 p-6">
  {/* パンくずナビゲーション */}
  <nav className="breadcrumbs text-sm">
    <ul>
      <li>
        <Link to="/admin">
          <Home className="h-4 w-4" />
        </Link>
      </li>
      <li>アーティスト管理</li>
    </ul>
  </nav>

  {/* ヘッダー */}
  <h1 className="font-bold text-2xl">アーティスト管理</h1>
  ...
</div>
```

| ページ | パンくず |
|--------|---------|
| ダッシュボード | ホーム > ダッシュボード |
| アーティスト一覧 | ホーム > アーティスト管理 |
| サークル一覧 | ホーム > サークル管理 |
| イベントシリーズ一覧 | ホーム > イベントシリーズ管理 |
| 公式作品一覧 | ホーム > 公式作品管理 |
| プラットフォーム一覧 | ホーム > プラットフォーム管理 |

#### 詳細画面

```tsx
<div className="container mx-auto space-y-6 p-6">
  {/* パンくずナビゲーション */}
  <nav className="breadcrumbs text-sm">
    <ul>
      <li>
        <Link to="/admin">
          <Home className="h-4 w-4" />
        </Link>
      </li>
      <li>
        <Link to="/admin/artists">アーティスト管理</Link>
      </li>
      <li>{artist.name}</li>
    </ul>
  </nav>

  {/* ヘッダー */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <Link to="/admin/artists" className="btn btn-ghost btn-sm">
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <h1 className="font-bold text-2xl">{artist.name}</h1>
      <Badge>...</Badge>
    </div>
    <div className="flex gap-2">
      <Button variant="outline" size="sm">編集</Button>
      <Button variant="outline" size="sm" className="text-error">削除</Button>
    </div>
  </div>
  ...
</div>
```

| ページ | パンくず |
|--------|---------|
| アーティスト詳細 | ホーム > アーティスト管理（リンク） > 個別名 |
| トラック詳細 | ホーム > トラック管理（リンク） > 個別名 |
| 公式作品詳細 | ホーム > 公式作品管理（リンク） > 個別名 |
| プラットフォーム詳細 | ホーム > プラットフォーム管理（リンク） > 個別名 |

### パンくずナビゲーション規則

- ホームアイコンは常に先頭に表示（`<Home className="h-4 w-4" />`）
- 一覧画面: ホーム → エンティティ管理（現在地、リンクなし）
- 詳細画面: ホーム → エンティティ管理（リンク） → 個別名（現在地、リンクなし）
- パンくずのテキストは一覧ページと詳細ページで統一（例: 両方とも「アーティスト管理」）

---

## ボタンの使い分け

| 用途 | variant | サイズ | 例 |
|------|---------|--------|-----|
| 主要アクション | `primary` | `md` | 新規作成、保存、確定 |
| セカンダリアクション | `outline` | `sm` / `md` | キャンセル（確認時）、インポート |
| 補助アクション | `ghost` | `md` | ダイアログのキャンセル |
| 危険なアクション | `destructive` | `md` | 削除確認 |
| アイコンボタン（テーブル内） | `ghost` + `size="icon"` | - | 編集、削除 |

### 使用例

```tsx
// 主要アクション
<Button variant="primary" onClick={handleCreate}>
  <Plus className="mr-1 h-4 w-4" />
  新規作成
</Button>

// セカンダリアクション
<Button variant="outline" size="sm" onClick={handleCancel}>
  キャンセル
</Button>

// アイコンボタン（編集）
<Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
  <Pencil className="h-4 w-4" />
</Button>

// アイコンボタン（削除）
<Button
  variant="ghost"
  size="icon"
  className="text-error hover:text-error"
  onClick={() => handleDelete(item)}
>
  <Trash2 className="h-4 w-4" />
</Button>

// ダイアログフッター
<DialogFooter>
  <Button variant="ghost" onClick={onClose}>キャンセル</Button>
  <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
    {isSubmitting ? "保存中..." : "保存"}
  </Button>
</DialogFooter>
```

---

## テーブル表示

### 基本構成

```tsx
<Table zebra={true}>
  <TableHeader>
    <TableRow className="hover:bg-transparent">
      <TableHead className="w-[220px]">ID</TableHead>
      <TableHead>名前</TableHead>
      <TableHead className="w-[70px]" /> {/* アクション列 */}
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id}>
        <TableCell className="font-mono text-base-content/50 text-xs">
          {item.id}
        </TableCell>
        <TableCell className="font-medium">{item.name}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {/* 編集・削除ボタン */}
          </div>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### セルのスタイル

| 内容 | クラス |
|------|--------|
| ID | `font-mono text-base-content/50 text-xs` |
| メイン項目（名前等） | `font-medium` |
| 補足情報（備考等） | `max-w-[200px] truncate text-base-content/70` |
| 日時 | `whitespace-nowrap text-base-content/70 text-sm` |
| 空値 | `-` で表示 |

### カラム表示制御

- `use-column-visibility` フックで状態管理
- LocalStorage に保存（キー例: `admin:artists`）
- デフォルト非表示推奨: `id`, `createdAt`, `updatedAt`

```tsx
const COLUMN_CONFIGS = [
  { key: "id", label: "ID", defaultVisible: false },
  { key: "name", label: "名前" },
  { key: "notes", label: "備考" },
  { key: "createdAt", label: "作成日時", defaultVisible: false },
];
```

### ページネーション

- ページサイズ: 10 / 20 / 50 / 100
- 表示形式: `全{total}件中 {startItem}〜{endItem}件を表示`

---

## 並べ替えUI

マスタ管理ページなど、手動で順序を変更するテーブルで使用する統一パターン。

### コンポーネント構成

| コンポーネント | ファイル | 役割 |
|--------------|---------|------|
| `SortIcon` | `components/admin/sort-icon.tsx` | ヘッダーのソート状態表示 |
| `ReorderButtons` | `components/admin/reorder-buttons.tsx` | 順序値表示 + 上下移動ボタン |
| `useSortableTable` | `hooks/use-sortable-table.ts` | ソート状態管理フック |

### SortIcon

テーブルヘッダーに表示するソート状態アイコン。

```tsx
import { SortIcon } from "@/components/admin/sort-icon";

<TableHead
  className="cursor-pointer select-none hover:bg-base-200"
  onClick={() => handleSort("name")}
>
  名前
  <SortIcon column="name" sortBy={sortBy} sortOrder={sortOrder} />
</TableHead>
```

| 状態 | アイコン |
|------|---------|
| 未ソート（他の列でソート中） | `ArrowUpDown`（薄い色） |
| 昇順 | `ArrowUp` |
| 降順 | `ArrowDown` |

### ReorderButtons

順序値の表示と上下移動ボタンを一体化したコンポーネント。

```tsx
import { ReorderButtons } from "@/components/admin/reorder-buttons";

<TableCell>
  <ReorderButtons
    sortOrder={item.sortOrder}
    onMoveUp={() => handleMoveUp(item, index)}
    onMoveDown={() => handleMoveDown(item, index)}
    isFirst={index === 0}
    isLast={index === items.length - 1}
    disabled={isReorderDisabled}
  />
</TableCell>
```

**注意:** `ReorderButtons`で`sortOrder`を表示するため、テーブルに別途「順序」カラムは不要。

### useSortableTable

ソート状態を管理するフック。3段階ソート（昇順→降順→リセット）をデフォルトでサポート。

```tsx
import { useSortableTable } from "@/hooks/use-sortable-table";

const { sortBy, sortOrder, handleSort, resetSort } = useSortableTable({
  defaultSortBy: "sortOrder",  // デフォルト: "sortOrder"
  defaultSortOrder: "asc",     // デフォルト: "asc"
  onSortChange: () => {},      // ソート変更時のコールバック
  threeStateSort: true,        // デフォルト: true（3段階ソート有効）
});
```

### 3段階ソートの動作

| クリック回数 | 動作 |
|------------|------|
| 1回目 | 昇順（ASC） |
| 2回目 | 降順（DESC） |
| 3回目 | リセット（デフォルトソートに戻る） |

`threeStateSort: false`を設定すると、従来の2段階ソート（昇順↔降順のトグル）になる。

### isReorderDisabled ルール

並べ替え操作を無効化する条件を統一する。

```tsx
const isReorderDisabled =
  !!debouncedSearch ||    // 検索中
  !!filterValue ||        // フィルター中（該当ページのみ）
  sortBy !== "sortOrder"; // sortOrder以外でソート中
```

**理由:**
- 検索やフィルター中は表示順が実際の順序と異なる可能性がある
- `sortOrder`以外でソート中に移動すると意図しない結果になる

### フッターメッセージ

並べ替えが無効な理由をユーザーに伝える。

```tsx
<div className="border-base-300 border-t p-4 text-base-content/70 text-sm">
  全 {total} 件
  {isReorderDisabled && debouncedSearch && (
    <span className="ml-2 text-warning">
      （検索中は並び替えできません）
    </span>
  )}
  {isReorderDisabled && !debouncedSearch && sortBy !== "sortOrder" && (
    <span className="ml-2 text-warning">
      （並び替えでソート中は移動できません）
    </span>
  )}
</div>
```

### 基準実装

`platforms.tsx`が最も完成度の高い実装。新規ページ作成時はこれを参照する。

### 適用ページ

| ページ | ソート可能カラム |
|--------|------------------|
| `platforms.tsx` | sortOrder, code, name |
| `credit-roles.tsx` | sortOrder, code, label |
| `alias-types.tsx` | sortOrder, code, label |
| `official-work-categories.tsx` | sortOrder, code, name |
| `event-series.tsx` | sortOrder, name |

---

## 行選択（一括操作）

複数の行を選択して一括操作（削除など）を行う機能。

### useRowSelection

ページをまたいだ行選択を管理するフック。

```tsx
import { useRowSelection } from "@/hooks/use-row-selection";

const {
  selectedIds,       // 選択中のID Set
  selectedItems,     // 選択中のアイテム Map<id, item>
  isSelected,        // (id) => boolean
  isAllSelected,     // (currentPageItems) => boolean
  isIndeterminate,   // (currentPageItems) => boolean（一部選択状態）
  toggleItem,        // (item) => void
  toggleAll,         // (currentPageItems) => void
  clearSelection,    // () => void
  selectedCount,     // 選択件数
} = useRowSelection<Item>();
```

### 選択UI

```tsx
{/* ヘッダーチェックボックス */}
<TableHead className="w-[50px]">
  <Checkbox
    checked={isAllSelected(items)}
    indeterminate={isIndeterminate(items)}
    onCheckedChange={() => toggleAll(items)}
    aria-label="すべて選択"
  />
</TableHead>

{/* 行チェックボックス */}
<TableCell>
  <Checkbox
    checked={isSelected(item.id)}
    onCheckedChange={() => toggleItem(item)}
    aria-label={`${item.name}を選択`}
  />
</TableCell>
```

### 一括削除ボタン

```tsx
{selectedCount > 0 && (
  <Button
    variant="destructive"
    size="sm"
    onClick={() => setShowDeleteConfirm(true)}
  >
    <Trash2 className="mr-1 h-4 w-4" />
    {selectedCount}件を削除
  </Button>
)}
```

---

## Selectコンポーネントのバリエーション

用途に応じて適切なSelectコンポーネントを選択する。

| コンポーネント | 用途 | 特徴 |
|--------------|------|------|
| `Select` | 単純な選択 | 基本的なドロップダウン |
| `SearchableSelect` | 検索可能な選択 | テキスト検索付き |
| `GroupedSearchableSelect` | グループ化選択 | 2階層グループ |
| `NestedGroupedSearchableSelect` | 3階層選択 | 原曲選択など複雑な階層 |
| `EnhancedTrackSelect` | トラック選択 | 詳細情報カード表示 |

### Portalレンダリングパターン

モーダル内でドロップダウンが切れる問題を解決するため、`NestedGroupedSearchableSelect`と`EnhancedTrackSelect`はReact Portalを使用してドロップダウンを描画する。

```tsx
// Portal使用パターン
const [portalContainer, setPortalContainer] = useState<Element | null>(null);

useEffect(() => {
  // モーダル要素またはdocument.bodyにポータル
  const modal = document.querySelector('.modal');
  setPortalContainer(modal || document.body);
}, [isOpen]);

// ドロップダウンをPortalで描画
{isOpen && portalContainer && createPortal(
  <div style={dropdownStyle} className="fixed ...">
    {/* ドロップダウンコンテンツ */}
  </div>,
  portalContainer
)}
```

---

## 編集ダイアログパターン

管理画面の各エンティティは統一された編集ダイアログコンポーネントを持つ。

### ファイル構成

```
components/admin/
├── artist-edit-dialog.tsx      # アーティスト
├── circle-edit-dialog.tsx      # サークル
├── release-edit-dialog.tsx     # 作品
├── track-edit-dialog.tsx       # トラック
├── event-edit-dialog.tsx       # イベント
├── event-series-edit-dialog.tsx # イベントシリーズ
├── official-work-edit-dialog.tsx # 公式作品
├── official-song-edit-dialog.tsx # 公式楽曲
├── artist-alias-edit-dialog.tsx  # アーティスト別名
├── platform-edit-dialog.tsx    # プラットフォーム（マスタ）
├── alias-type-edit-dialog.tsx  # 別名種別（マスタ）
├── credit-role-edit-dialog.tsx # クレジット種別（マスタ）
└── official-work-category-edit-dialog.tsx # 作品カテゴリ（マスタ）
```

### 命名規則

- **ファイル名**: `{entity}-edit-dialog.tsx`
- **コンポーネント名**: `{Entity}EditDialog`
- **Props**: `data`（編集対象、nullで新規作成）、`open`、`onOpenChange`

### 基本構成

```tsx
<Dialog open={isOpen} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>新規作成</DialogTitle>
    </DialogHeader>

    <div className="grid gap-4 py-4">
      {/* フォームフィールド */}
    </div>

    <DialogFooter>
      <Button variant="ghost" onClick={onClose}>キャンセル</Button>
      <Button variant="primary" onClick={handleSubmit}>作成</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## フォームパターン

### フィールドパターン

```tsx
{/* 必須フィールド */}
<div className="grid gap-2">
  <Label htmlFor="name">
    名前 <span className="text-error">*</span>
  </Label>
  <Input id="name" value={form.name} onChange={...} placeholder="例: ZUN" />
</div>

{/* 2列レイアウト */}
<div className="grid grid-cols-2 gap-4">
  <div className="grid gap-2">
    <Label htmlFor="nameJa">日本語名</Label>
    <Input id="nameJa" ... />
  </div>
  <div className="grid gap-2">
    <Label htmlFor="nameEn">英語名</Label>
    <Input id="nameEn" ... />
  </div>
</div>

{/* 関連エンティティ選択 + 新規作成 */}
<div className="grid gap-2">
  <Label htmlFor="seriesId">
    シリーズ <span className="text-error">*</span>
  </Label>
  <div className="flex items-center gap-2">
    <SearchableSelect
      id="seriesId"
      value={form.seriesId}
      onChange={(value) => setForm({ ...form, seriesId: value })}
      options={seriesList.map((s) => ({ value: s.id, label: s.name }))}
      placeholder="選択してください"
      className="flex-1"
    />
    <Button type="button" variant="outline" onClick={openNewSeriesDialog}>
      <Plus className="mr-1 h-4 w-4" />
      新規
    </Button>
  </div>
</div>
```

---

## カラースキーム

daisyUI のセマンティックカラーを使用する。

### カラートークン

| トークン | 用途 |
|---------|------|
| `primary` | 主要アクション（ボタン、バッジ） |
| `secondary` | 補助的な強調 |
| `accent` | アクセント |
| `success` | 成功状態 |
| `warning` | 警告 |
| `error` | エラー、削除アクション |
| `info` | 情報 |

### 背景・テキスト

| トークン | 用途 |
|---------|------|
| `bg-base-100` | デフォルト背景 |
| `bg-base-200` | 淡いグレー背景（テーブルヘッダ） |
| `bg-base-200/30` | セミトランスペアレント背景 |
| `text-base-content` | 通常テキスト |
| `text-base-content/70` | 副テキスト |
| `text-base-content/50` | 補足テキスト（ID等） |

### テーマ

- `data-theme` 属性で切り替え（light / dark）
- 3オプション: `system`（OS設定）、`light`、`dark`
- localStorage に永続化

---

## アイコン規約

lucide-react を使用する。

### 標準アイコン

| 用途 | アイコン | サイズ |
|------|---------|--------|
| 追加 | `Plus` | `h-4 w-4` |
| 編集 | `Pencil` | `h-4 w-4` |
| 削除 | `Trash2` | `h-4 w-4` |
| 詳細画面へ | `Eye` | `h-4 w-4` |
| 外部リンク | `ExternalLink` | `h-4 w-4` |
| 検索 | `Search` | `h-4 w-4` |
| 設定 | `Settings2` | `h-4 w-4` |
| カレンダー | `Calendar` | `h-4 w-4` |
| 前へ | `ChevronLeft` | `h-4 w-4` |
| 次へ | `ChevronRight` | `h-4 w-4` |
| 読み込み中 | `Loader2` + `animate-spin` | `h-4 w-4` |
| メニュー | `Menu` | `h-5 w-5` |
| サイドバー | `PanelLeft` | `h-5 w-5` |

### サイズ規約

| コンテキスト | サイズ |
|-------------|--------|
| ボタン内アイコン | `h-4 w-4` |
| ナビゲーション | `h-5 w-5` |
| アイコンボタン（テーブル） | `h-4 w-4` |

---

## レスポンシブ対応

### ブレークポイント

| ブレークポイント | 用途 |
|-----------------|------|
| `sm:` | モバイル → タブレット切り替え |
| `lg:` | タブレット → デスクトップ切り替え |

### 適用パターン

```tsx
{/* ActionBar・Pagination */}
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

{/* サイドバー表示 */}
<div className={`drawer ${sidebarOpen ? "lg:drawer-open" : ""}`}>

{/* パディング */}
<main className="p-4 lg:p-6">

{/* モバイルのみ表示 */}
<button className="lg:hidden">

{/* デスクトップのみ表示 */}
<div className="hidden lg:flex">
```

### テーブルのスクロール対応

```tsx
<div className="overflow-x-auto">
  <Table>...</Table>
</div>
```

---

## ID生成ルール

### プレフィックス一覧

| テーブル | プレフィックス | 形式例 |
|---------|---------------|--------|
| artist | `ar_` | `ar_aBcD1eFgH2iJkL3mNoPq4r` |
| artistAlias | `aa_` | `aa_aBcD1eFgH2iJkL3mNoPq4r` |
| circle | `ci_` | `ci_aBcD1eFgH2iJkL3mNoPq4r` |
| circleLink | `cl_` | `cl_aBcD1eFgH2iJkL3mNoPq4r` |
| track | `tr_` | `tr_aBcD1eFgH2iJkL3mNoPq4r` |
| trackCredit | `tc_` | `tc_aBcD1eFgH2iJkL3mNoPq4r` |
| release | `re_` | `re_aBcD1eFgH2iJkL3mNoPq4r` |
| disc | `di_` | `di_aBcD1eFgH2iJkL3mNoPq4r` |
| eventSeries | `es_` | `es_aBcD1eFgH2iJkL3mNoPq4r` |
| event | `ev_` | `ev_aBcD1eFgH2iJkL3mNoPq4r` |
| eventDay | `ed_` | `ed_aBcD1eFgH2iJkL3mNoPq4r` |

### プレフィックス命名規則

- **1単語**: 最初の2文字（`artist` → `ar`）
- **複合語**: 各単語の頭文字（`trackCredit` → `tc`）

### 仕様

- **形式**: `{prefix}_` + 21文字英数字
- **文字種**: `0-9A-Za-z`（英数字のみ、記号なし）
- **理由**: ダブルクリックで全選択可能にするため

### 使用方法

```typescript
import { createId } from "@thac/db/utils/id";

const artistId = createId.artist();       // ar_...
const trackId = createId.track();         // tr_...
const eventId = createId.event();         // ev_...
```

### 例外

- **認証テーブル**: Better-Auth標準（プレフィックスなし）
- **マスターテーブル**: `code` を主キーとして使用（platforms, aliasTypes, creditRoles等）
- **中間テーブル**: 複合主キー、ID列なし（releaseCircles, trackCreditRoles等）

---

## エラー表示

### テーブル上部のエラー

```tsx
{displayError && (
  <div className="border-base-300 border-b bg-error/10 p-3 text-error text-sm">
    {displayError}
  </div>
)}
```

### ダイアログ内のエラー

```tsx
{mutationError && (
  <div className="bg-error/10 p-3 text-error text-sm rounded">
    {mutationError}
  </div>
)}
```

---

## ローディング状態

### テーブルスケルトン

```tsx
{isLoading ? (
  <DataTableSkeleton
    rows={5}
    columns={6}
    showActionBar={false}
    showPagination={false}
  />
) : (
  <Table>...</Table>
)}
```

### ボタンのローディング

```tsx
<Button variant="primary" disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      保存中...
    </>
  ) : (
    "保存"
  )}
</Button>
```

---

## フィードバック・通知

### 基本方針

GitHub Primerのアクセシビリティガイドラインに従い、**トースト通知は使用しない**。

**理由（WCAG違反の可能性）:**
- 2.2.1 タイミング調整: 自動消滅により読む時間が不足
- 1.3.2 意味のある構造: DOMの端に配置され発見困難
- 2.1.1 キーボード操作: キーボードアクセスが困難
- 4.1.3 ステータスメッセージ: ワークフローを中断すべきでない

参考: [Primer - Accessible Notifications](https://primer.style/accessibility/patterns/accessible-notifications-and-messages/)

### 推奨パターン

| 状況 | 対応 | 例 |
|------|------|-----|
| 成功（単純） | 通知不要 | 削除→リストから消える、保存→ダイアログ閉じる |
| 成功（複雑） | Banner表示 | バッチ操作完了「5件をインポートしました」 |
| エラー（フォーム） | インライン表示 | ダイアログ内エラー（既存パターン） |
| エラー（ページ） | Banner表示 | 削除失敗時にページ上部に表示 |

### Bannerコンポーネント

ページレベルのフィードバック表示に使用。`components/ui/banner.tsx`

**Props:**
- `variant`: `"info"` | `"warning"` | `"error"` | `"success"`
- `children`: メッセージ内容
- `onDismiss`: 閉じるボタンのコールバック
- `dismissible`: 閉じるボタンの表示（デフォルト: true）

**アクセシビリティ:**
- `role="alert"` でスクリーンリーダーに即座に通知
- `aria-live="assertive"`（error）/ `"polite"`（その他）

```tsx
import { Banner } from "@/components/ui/banner";

// ページレベルのエラー表示
const [actionError, setActionError] = useState<string | null>(null);

// JSX
{actionError && (
  <Banner variant="error" onDismiss={() => setActionError(null)}>
    {actionError}
  </Banner>
)}

// エラーハンドリング
try {
  await deleteItem(id);
  // 成功通知は不要（リストからアイテムが消えることで自明）
} catch (err) {
  setActionError(err instanceof Error ? err.message : "削除に失敗しました");
}
```

### インラインエラー（ダイアログ内）

既存パターンを継続使用:

```tsx
{error && (
  <div className="rounded-md bg-error/10 p-3 text-error text-sm">
    {error}
  </div>
)}
```

### 禁止事項

- `sonner` や `react-hot-toast` などのトーストライブラリの使用禁止
- 自動消滅する通知の実装禁止
- 成功通知の乱用（UIの変化で自明な場合は不要）

---

## 確認ダイアログ

破壊的アクション前に確認を求める。`ConfirmDialog`コンポーネントを使用する。

### ConfirmDialogコンポーネント

```tsx
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
const [isDeleting, setIsDeleting] = useState(false);

// 削除ボタン
<Button
  variant="ghost"
  size="icon"
  className="text-error hover:text-error"
  onClick={() => setDeleteTarget(item)}
>
  <Trash2 className="h-4 w-4" />
</Button>

// 確認ダイアログ
<ConfirmDialog
  open={!!deleteTarget}
  onOpenChange={(open) => !open && setDeleteTarget(null)}
  title="削除の確認"
  description={`「${deleteTarget?.name}」を削除しますか？この操作は取り消せません。`}
  confirmLabel="削除"
  cancelLabel="キャンセル"
  onConfirm={handleConfirmDelete}
  variant="danger"
  isLoading={isDeleting}
/>
```

### ConfirmDialogのProps

| Prop | 型 | 説明 |
|------|-----|------|
| `open` | `boolean` | ダイアログの開閉状態 |
| `onOpenChange` | `(open: boolean) => void` | 開閉状態変更コールバック |
| `title` | `string` | ダイアログタイトル |
| `description` | `ReactNode` | 説明文 |
| `confirmLabel` | `string` | 確認ボタンラベル（デフォルト: "確認"） |
| `cancelLabel` | `string` | キャンセルボタンラベル（デフォルト: "キャンセル"） |
| `onConfirm` | `() => void` | 確認時のコールバック |
| `onCancel` | `() => void` | キャンセル時のコールバック（オプション） |
| `isLoading` | `boolean` | ローディング状態（ボタン無効化） |
| `variant` | `"danger" \| "warning" \| "default"` | ダイアログの種類 |

### variantの使い分け

| variant | 用途 | 表示 |
|---------|------|------|
| `danger` | 削除、破壊的操作 | 赤アイコン、destructiveボタン |
| `warning` | 注意が必要な操作 | 黄アイコン |
| `default` | 一般的な確認 | アイコンなし |

### 確認メッセージ規則

- 対象を明示: 「{名前}を削除しますか？」
- 影響を説明: 「関連データも削除されます」
- 取り消し不可を明示: 「この操作は取り消せません」

---

## 空状態（Empty State）

データがない場合の表示。

### テーブル内の空状態

```tsx
{items.length === 0 ? (
  <TableRow>
    <TableCell
      colSpan={columnCount}
      className="h-24 text-center text-base-content/50"
    >
      該当するデータが見つかりません
    </TableCell>
  </TableRow>
) : (
  items.map((item) => <TableRow key={item.id}>...</TableRow>)
)}
```

### メッセージパターン

| 状況 | メッセージ |
|------|-----------|
| 初期状態（データなし） | 「まだデータがありません」 |
| 検索結果なし | 「該当する{エンティティ}が見つかりません」 |
| フィルター結果なし | 「条件に一致する{エンティティ}がありません」 |

### スタイル

- 高さ確保: `h-24`（96px）
- テキスト色: `text-base-content/50`
- 中央寄せ: `text-center`
- colSpan: 全カラム数を指定

### 初期状態での誘導（オプション）

```tsx
<TableCell colSpan={columnCount} className="h-32 text-center">
  <div className="flex flex-col items-center gap-2 text-base-content/50">
    <p>まだアーティストがありません</p>
    <Button variant="primary" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
      <Plus className="mr-1 h-4 w-4" />
      新規作成
    </Button>
  </div>
</TableCell>
```

---

## 検索・フィルター

### デバウンス

入力から API 呼び出しまで 300ms の遅延を設ける。

```tsx
import { useDebounce } from "~/hooks/use-debounce";

const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 300);

const { data } = useQuery({
  queryKey: ["artists", page, pageSize, debouncedSearch],
  queryFn: () => artistsApi.list({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
  }),
});
```

### 検索時のページリセット

```tsx
const handleSearchChange = (value: string) => {
  setSearch(value);
  setPage(1); // 1ページ目に戻す
};
```

### フィルターのクリア

```tsx
<DataTableActionBar
  searchValue={search}
  onSearchChange={handleSearchChange}
  filterValue={filter}
  onFilterChange={handleFilterChange}
  // クリアボタンは DataTableActionBar 内で自動表示
/>
```

### 検索条件のURL同期（オプション）

```tsx
// TanStack Router の searchParams を使用
const { search, filter } = Route.useSearch();

const navigate = Route.useNavigate();

const handleSearchChange = (value: string) => {
  navigate({ search: { ...currentSearch, search: value, page: 1 } });
};
```

---

## キーボード操作

### ダイアログのキーボード対応

HTML `<dialog>` 要素の標準動作として以下をサポート:

- `Escape`: ダイアログを閉じる
- バックドロップクリック: ダイアログを閉じる

```tsx
// dialog.tsx で自動対応
<dialog ref={dialogRef} className="modal">
  <div className="modal-box">...</div>
  <form method="dialog" className="modal-backdrop">
    <button type="submit">close</button>
  </form>
</dialog>
```

### フォームのキーボード対応

```tsx
// Enter で送信（フォーム内）
<form onSubmit={handleSubmit}>
  <Input ... />
  <Button type="submit">保存</Button>
</form>

// または onKeyDown で制御
<Input
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }}
/>
```

### 外側クリックでの閉じる

```tsx
// SearchableSelect などのドロップダウン
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);
```

### フォーカス管理

```tsx
// ダイアログ表示時に最初の入力にフォーカス
useEffect(() => {
  if (isOpen) {
    inputRef.current?.focus();
  }
}, [isOpen]);
```

---

## アクセシビリティ

### フォーカスリング

daisyUI のデフォルトスタイルを使用。カスタマイズが必要な場合:

```tsx
<Button className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
```

### ラベルとフォーム要素の関連付け

```tsx
<div className="grid gap-2">
  <Label htmlFor="name">名前</Label>
  <Input id="name" ... />
</div>
```

### アイコンボタンのラベル

```tsx
<Button variant="ghost" size="icon" aria-label="編集">
  <Pencil className="h-4 w-4" />
</Button>

<Button variant="ghost" size="icon" aria-label="削除">
  <Trash2 className="h-4 w-4" />
</Button>
```

### テーブルのアクセシビリティ

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead scope="col">名前</TableHead>
      ...
    </TableRow>
  </TableHeader>
  <TableBody>...</TableBody>
</Table>
```

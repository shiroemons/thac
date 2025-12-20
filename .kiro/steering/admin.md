# 管理画面デザインガイドライン

管理画面の統一的なデザインパターンとルールを定義する。

---

## ページレイアウト

### 一覧画面

```
┌─────────────────────────────────────────────────┐
│ AdminPageHeader（タイトル + パンくずナビ）         │
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
│ AdminPageHeader（タイトル + パンくずナビ）         │
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
| `AdminPageHeader` | タイトル、説明、パンくずナビゲーション |
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

### AdminPageHeader（画面内タイトル）

#### 一覧画面

**形式**: `{エンティティ名}管理`

```tsx
<AdminPageHeader
  title="アーティスト管理"
  breadcrumbs={[{ label: "アーティスト" }]}
/>
```

| ページ | title | breadcrumbs |
|--------|-------|-------------|
| アーティスト一覧 | `アーティスト管理` | `[{ label: "アーティスト" }]` |
| サークル一覧 | `サークル管理` | `[{ label: "サークル" }]` |
| イベント一覧 | `イベント管理` | `[{ label: "イベント" }]` |
| トラック一覧 | `トラック管理` | `[{ label: "トラック" }]` |
| 作品一覧 | `作品管理` | `[{ label: "作品" }]` |

#### 詳細画面

**形式**: `{エンティティ名}詳細`

```tsx
<AdminPageHeader
  title="トラック詳細"
  breadcrumbs={[
    { label: "トラック", href: "/admin/tracks" },
    { label: track.name },
  ]}
/>
```

| ページ | title | breadcrumbs |
|--------|-------|-------------|
| 作品詳細 | `作品詳細` | `[{ label: "作品", href: "/admin/releases" }, { label: release.name }]` |
| トラック詳細 | `トラック詳細` | `[{ label: "トラック", href: "/admin/tracks" }, { label: track.name }]` |

### パンくずナビゲーション規則

- ホームアイコンは常に表示（AdminPageHeader内で自動付与）
- 一覧画面: ホーム → エンティティ名（現在地、リンクなし）
- 詳細画面: ホーム → エンティティ名（一覧へのリンク） → 個別名（現在地、リンクなし）

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

## フォームパターン

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

# Design System - 東方編曲録

## Overview

daisyUI + TailwindCSS v4 ベースのデザインシステム。
公開画面で一貫したビジュアル言語を維持するためのガイドライン。

## Spacing

**Base: 4px (Tailwind default)**

| Token | Value | Usage |
|-------|-------|-------|
| `gap-1` / `p-1` | 4px | アイコン間、バッジ間 |
| `gap-2` / `p-2` | 8px | コンパクトな要素間 |
| `gap-3` / `p-3` | 12px | リスト項目間 |
| `gap-4` / `p-4` | 16px | カード内パディング（小） |
| `gap-5` / `p-5` | 20px | カード内パディング（標準） |
| `gap-6` / `p-6` | 24px | セクション間、カード内パディング（大） |
| `gap-8` / `p-8` | 32px | 大きなセクション間 |

**推奨:**
- カード内パディング: `p-5` (標準) または `p-6` (ヒーロー)
- リスト項目間: `gap-3` または `gap-4`
- セクション間: `space-y-6` または `space-y-8`

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-lg` | 8px | ボタン、バッジ、小さな要素 |
| `rounded-xl` | 12px | アイコンコンテナ、入力フィールド |
| `rounded-2xl` | 16px | カード、モーダル、セクション |
| `rounded-full` | 50% | アバター、丸いボタン |

**推奨:**
- カード: `rounded-2xl`
- ボタン: `rounded-lg` (daisyUI default)
- アイコンコンテナ: `rounded-xl`

## Typography Colors

| Token | Opacity | Usage |
|-------|---------|-------|
| `text-base-content` | 100% | 見出し、重要なテキスト |
| `text-base-content/70` | 70% | サブタイトル、補足情報 |
| `text-base-content/60` | 60% | 説明文、メタ情報 |
| `text-base-content/50` | 50% | プレースホルダー、無効状態 |
| `text-primary` | - | リンク、アクセントテキスト |
| `text-secondary` | - | セカンダリアクセント |
| `text-accent` | - | アーティスト関連 |

**推奨:**
- 見出し: `text-base-content` (デフォルト)
- サブテキスト: `text-base-content/70`
- 説明文・メタ: `text-base-content/60`
- `/50` は避け、`/60` を使用（ただしプレースホルダー等の特殊用途は除く）

## Depth (Border + Shadow)

### Border
```tsx
// 標準カード
border border-base-300

// ガラスモーフィズム
border border-base-content/10

// セパレーター
border-base-content/5
```

### Shadow
```tsx
// 静止状態
shadow-sm  // 軽いエレベーション

// ホバー状態
shadow-lg  // カードホバー時

// モーダル・ドロップダウン
shadow-xl
```

**推奨:**
- カード静止時: `shadow-sm` または影なし
- カードホバー時: `shadow-lg`
- `shadow-md` は使用しない（統一のため）

## Card Pattern

### Standard Card
```tsx
<Card className="rounded-2xl p-5 transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/10">
  {/* content */}
</Card>
```

### Glass Card
```tsx
<Card className="glass-card rounded-2xl p-5 transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/10">
  {/* content */}
</Card>
```

### Clickable Card
```tsx
<Link to={href}>
  <Card className="group rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-primary/10">
    {/* icon with group-hover:scale-110 */}
  </Card>
</Link>
```

## Button Pattern

daisyUI の `btn` クラスをベースに使用。

```tsx
// プライマリ
<Button variant="primary" size="md">Action</Button>
// → btn btn-primary

// ゴースト
<Button variant="ghost" size="sm">Cancel</Button>
// → btn btn-ghost btn-sm

// アウトライン
<Button variant="outline">Secondary</Button>
// → btn btn-outline
```

**推奨サイズ:**
- 通常ボタン: `size="md"` (デフォルト)
- コンパクトUI: `size="sm"`
- ヒーローセクション: `size="lg"`

## Icon Pattern

### Icon Sizes
```tsx
// 小（インライン）
<Icon className="size-4" />  // 16px

// 中（ボタン内、リスト）
<Icon className="size-5" />  // 20px

// 大（カード、ヒーロー）
<Icon className="size-6" />  // 24px

// 特大（ヒーローアイコン）
<Icon className="size-7" />  // 28px
```

**推奨:**
- `h-N w-N` ではなく `size-N` を使用

### Icon Container
```tsx
// アイコンコンテナ（標準）
<div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
  <Icon className="size-5" />
</div>

// アイコンコンテナ（小）
<div className="flex size-8 items-center justify-center rounded-full bg-accent/10 text-accent">
  <Icon className="size-4" />
</div>
```

### Icon Hover
```tsx
// グループホバーでスケール
<div className="... transition-transform duration-300 group-hover:scale-110">
  <Icon />
</div>
```

## Hover Effects

### Standard Hover
```tsx
// カード
className="transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-primary/10"

// リンクテキスト
className="transition-colors hover:text-primary"

// テーブル行
className="hover:bg-base-200/50"
```

**推奨:**
- `duration-200` ではなく `duration-300` を使用
- ホバー時のリング: `ring-2 ring-primary/10`

## Color Usage

### Semantic Colors
| Color | Usage |
|-------|-------|
| `primary` | メインアクション、リンク、サークル関連 |
| `secondary` | セカンダリアクション、原曲関連 |
| `accent` | アーティスト関連 |
| `info` | イベント、情報 |
| `success` | 成功状態、トレンド |
| `warning` | 警告 |
| `error` | エラー、削除 |

### Background Opacity
```tsx
// アイコン背景
bg-primary/10  // 10%

// セクション背景
bg-primary/5   // 5%

// ホバー背景
hover:bg-primary/10
```

## Responsive Design

### Breakpoints
```tsx
// モバイルファースト
sm:  // >= 640px
md:  // >= 768px
lg:  // >= 1024px
xl:  // >= 1280px
```

### Grid Patterns
```tsx
// カードグリッド
grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4

// 統計カード
grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5
```

## Animation

### Transitions
```tsx
// 標準トランジション
transition-all duration-300

// カラーのみ
transition-colors

// 変形のみ
transition-transform duration-300
```

### Custom Animations
```tsx
// サイドバースライド
animation: sidebarSlideDown 200ms ease-out

// パルス（装飾）
animate-pulse
```

## Checklist

コンポーネント作成時に確認:

- [ ] カードは `rounded-2xl` を使用
- [ ] テキスト色は `/70`, `/60` のみ（`/50` を避ける）
- [ ] アイコンは `size-N` を使用（`h-N w-N` ではない）
- [ ] ホバー効果は `shadow-lg` + `ring-2 ring-primary/10`
- [ ] アイコンコンテナは `rounded-xl` + `bg-{color}/10`
- [ ] トランジションは `duration-300`

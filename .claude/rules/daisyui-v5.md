---
paths: apps/web/**
---

# daisyUI v5 の落とし穴

本プロジェクトはdaisyUI v5 + TailwindCSS v4（`@plugin`インポート）を使用。

## Statsコンポーネントの背景

```tsx
// NG: v5では背景が透明になる
<div className="stats">

// OK: 背景を明示指定
<div className="stats bg-base-100">
```

## メニューアイテムの状態クラス

```tsx
// NG: v4以前のクラス名
<li className="active">
<li className="disabled">
<li className="focus">

// OK: v5のプレフィックス付きクラス名
<li className="menu-active">
<li className="menu-disabled">
<li className="menu-focus">
```

## ユーティリティクラスのリネーム

```tsx
// NG: v4以前
className="rounded-btn"

// OK: v5
className="rounded-field"
// ※ rounded-box は変更なし
```

## input/selectのデフォルト幅

v5では`input`/`select`のデフォルト幅が`20rem`に変更。レイアウトでは`w-full`を明示指定すること。

```tsx
// NG: 幅指定なし（20remで固定される）
<input className="input" />

// OK: 幅を明示
<input className="input w-full" />
```

## 垂直メニューの幅

v5では垂直メニューがデフォルトで`w-full`ではない。必要に応じて明示追加。

```tsx
// NG: 幅が縮む
<ul className="menu">

// OK: 全幅を明示
<ul className="menu w-full">
```

## テーブルのホバー

```tsx
// NG: v4以前のユーティリティクラス
<tr className="hover">

// OK: Tailwindのホバー擬似クラスを使用
<tr className="hover:bg-base-300">
```

## z-indexの書き方

Tailwind v4では`z-1`が正規クラス。`z-[1]`は不要。

```tsx
// NG: 不要な任意値記法
className="z-[1]"

// OK: Tailwind v4の正規クラス
className="z-1"
```

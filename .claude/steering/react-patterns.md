# React Patterns Guide

## 概要

Reactコンポーネント設計における推奨パターンとアンチパターン。
特にuseEffectの適切な使用法に焦点を当てる。

## useEffectの適切な使用

### useEffectが必要なケース

```
┌─────────────────────────────────────────────────────────────┐
│  useEffectを使うべき場面                                     │
├─────────────────────────────────────────────────────────────┤
│  1. 外部システムとの同期                                     │
│     - DOM API操作（document.title、スクロール位置など）       │
│     - ブラウザAPI（MediaQuery、Intersection Observerなど）   │
│     - サードパーティライブラリとの連携                       │
│                                                             │
│  2. サブスクリプション                                       │
│     - イベントリスナー（addEventListener）                   │
│     - WebSocket接続                                         │
│     - MutationObserver、ResizeObserver                      │
│                                                             │
│  3. タイマー管理                                            │
│     - setTimeout、setInterval                               │
│     - requestAnimationFrame                                 │
│     - debounce、throttle                                    │
└─────────────────────────────────────────────────────────────┘
```

### useEffectが不要なケース（アンチパターン）

以下のケースではuseEffectを使用しないこと。

#### 1. ユーザーイベントの結果処理

```typescript
// ❌ NG: useEffectでイベント結果を処理
useEffect(() => {
  if (query) {
    saveSearchHistory(query);
  }
}, [query]);

// ✅ OK: イベントハンドラ内で処理
const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  saveSearchHistory(inputValue);
  navigate({ search: { q: inputValue } });
};
```

**理由**: 検索実行はユーザーアクションの結果。イベントハンドラで直接処理すべき。

#### 2. propsからstateへの同期

```typescript
// ❌ NG: propsをstateにコピー
const [selectedId, setSelectedId] = useState<string | null>(null);
useEffect(() => {
  if (data?.id && !selectedId) {
    setSelectedId(data.id);
  }
}, [data?.id, selectedId]);

// ✅ OK: 派生状態として直接使用
const effectiveId = selectedId ?? data?.id ?? null;

// ✅ OK: 初期値として設定（React 18+）
const [selectedId, setSelectedId] = useState(() => data?.id ?? null);

// ✅ OK: keyでコンポーネントをリセット
<ChildComponent key={data?.id} initialId={data?.id} />
```

**理由**: 不要な再レンダリングを引き起こし、同期バグの原因になる。

#### 3. データ変換・フィルタリング

```typescript
// ❌ NG: useEffectで変換結果をstateに保存
const [filteredItems, setFilteredItems] = useState<Item[]>([]);
useEffect(() => {
  setFilteredItems(items.filter(item => item.active));
}, [items]);

// ✅ OK: レンダー中に直接計算
const filteredItems = items.filter(item => item.active);

// ✅ OK: 重い計算はuseMemoでメモ化
const filteredItems = useMemo(
  () => items.filter(item => item.active),
  [items]
);
```

**理由**: 派生データは計算で得られる。余分なstateは同期の問題を招く。

#### 4. stateの連鎖更新

```typescript
// ❌ NG: あるstateの変更を別のuseEffectで監視
useEffect(() => {
  if (isSubmitted) {
    setShowConfirmation(true);
  }
}, [isSubmitted]);

// ✅ OK: イベントハンドラで一括更新
const handleSubmit = async () => {
  await submitForm();
  setIsSubmitted(true);
  setShowConfirmation(true);
};
```

**理由**: 複数のuseEffectの連鎖は実行順序が予測困難でデバッグが難しい。

## TanStack Queryとの組み合わせ

### 条件付きデータフェッチ

```typescript
// ❌ NG: useEffectでフェッチを制御
useEffect(() => {
  if (activeTab === "releases") {
    fetchReleases();
  }
}, [activeTab]);

// ✅ OK: TanStack Queryのenabledオプション
const { data } = useQuery({
  queryKey: ["releases", eventId],
  queryFn: () => api.releases.list({ eventId }),
  enabled: activeTab === "releases",  // 条件付きで有効化
});
```

**理由**: TanStack Queryがキャッシュ・競合状態・クリーンアップを自動管理。

### 派生クエリ

```typescript
// ❌ NG: useEffectで依存クエリを制御
useEffect(() => {
  if (release?.eventId) {
    fetchEventDays(release.eventId);
  }
}, [release?.eventId]);

// ✅ OK: 依存する値を直接使用
const { data: eventDays } = useQuery({
  queryKey: ["events", release?.eventId, "days"],
  queryFn: () => eventDaysApi.list(release!.eventId),
  enabled: !!release?.eventId,
});
```

## localStorage操作

### 初期値の読み込み

```typescript
// ⚠️ 許容: マウント時のみの読み込み
useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) setState(saved);
}, []);

// ✅ 推奨: useSyncExternalStoreでSSR対応
const value = useSyncExternalStore(
  subscribe,
  () => localStorage.getItem(STORAGE_KEY),
  () => defaultValue  // SSR時のデフォルト
);
```

### 値の保存

```typescript
// ❌ NG: useEffectで保存
useEffect(() => {
  localStorage.setItem(STORAGE_KEY, value);
}, [value]);

// ✅ OK: 変更時に直接保存
const handleChange = (newValue: string) => {
  setValue(newValue);
  localStorage.setItem(STORAGE_KEY, newValue);
};
```

## 適切なuseEffectの例

```typescript
// ✅ DOM APIとの同期
useEffect(() => {
  document.documentElement.setAttribute("data-theme", theme);
}, [theme]);

// ✅ イベントリスナーの管理（クリーンアップ付き）
useEffect(() => {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => setIsDark(mediaQuery.matches);

  mediaQuery.addEventListener("change", handleChange);
  return () => mediaQuery.removeEventListener("change", handleChange);
}, []);

// ✅ タイマー管理（クリーンアップ付き）
useEffect(() => {
  const timer = setTimeout(() => setDebouncedValue(value), delay);
  return () => clearTimeout(timer);
}, [value, delay]);

// ✅ アニメーション制御
useEffect(() => {
  const id = requestAnimationFrame(() => setAnimationState(targetState));
  return () => cancelAnimationFrame(id);
}, [targetState]);
```

## ESLint設定

`eslint-plugin-react-compiler`で自動検出:

```javascript
// eslint.config.js
import reactCompiler from "eslint-plugin-react-compiler";

export default [
  {
    plugins: {
      "react-compiler": reactCompiler,
    },
    rules: {
      "react-compiler/react-compiler": "error",
    },
  },
];
```

## チェックリスト

新しいuseEffectを書く前に確認:

- [ ] イベントハンドラで処理できないか？
- [ ] 計算で導出できる値ではないか？
- [ ] useMemoで代替できないか？
- [ ] TanStack Queryのenabledで制御できないか？
- [ ] クリーンアップ関数は必要か？（リスナー、タイマー等）

## 参考資料

- [You Might Not Need an Effect](https://ja.react.dev/learn/you-might-not-need-an-effect)
- [Synchronizing with Effects](https://ja.react.dev/learn/synchronizing-with-effects)

---
_Last updated: 2026-01_

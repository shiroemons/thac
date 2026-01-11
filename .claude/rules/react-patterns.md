---
paths: apps/web/**/*.tsx
---

# Reactパターンガイド

## useEffectの使用ルール

### 使用禁止パターン

以下のケースではuseEffectを使用しないこと:

#### 1. ユーザーイベントの結果処理

```typescript
// ❌ NG
useEffect(() => {
  if (query) saveSearchHistory(query);
}, [query]);

// ✅ OK: イベントハンドラ内で処理
const handleSearch = () => {
  saveSearchHistory(inputValue);
  navigate({ search: { q: inputValue } });
};
```

#### 2. propsからstateへの同期

```typescript
// ❌ NG
useEffect(() => {
  if (data?.id) setSelectedId(data.id);
}, [data?.id]);

// ✅ OK: 派生状態として直接使用
const effectiveId = selectedId ?? data?.id;
```

#### 3. データ変換・フィルタリング

```typescript
// ❌ NG
useEffect(() => {
  setFilteredItems(items.filter(x => x.active));
}, [items]);

// ✅ OK: useMemoまたは直接計算
const filteredItems = useMemo(
  () => items.filter(x => x.active),
  [items]
);
```

#### 4. TanStack Queryのフェッチ制御

```typescript
// ❌ NG
useEffect(() => {
  if (activeTab === "releases") fetchReleases();
}, [activeTab]);

// ✅ OK: enabledオプション
const { data } = useQuery({
  queryKey: ["releases"],
  queryFn: () => api.releases.list(),
  enabled: activeTab === "releases",
});
```

### 使用が適切なケース

- DOM API操作（document属性の変更など）
- イベントリスナーの登録/解除（クリーンアップ必須）
- タイマー管理（setTimeout、requestAnimationFrame）
- 外部ライブラリとの同期

### Lintルール

`eslint-plugin-react-compiler`で自動検出:

```bash
bun run --cwd apps/web lint:jsx-nesting
```

### 参考

- [You Might Not Need an Effect](https://ja.react.dev/learn/you-might-not-need-an-effect)
- `.kiro/steering/react-patterns.md`（詳細なガイド）

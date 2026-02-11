---
paths:
  - packages/db/**
  - apps/server/**
---

# クエリ最適化パターン

## N+1クエリの排除

ループ内SELECTは禁止。`inArray`でバッチ取得 + Mapでグルーピング。

```typescript
const trackIds = tracks.map((t) => t.id);
const allCredits = await db.select().from(trackCredits)
  .where(inArray(trackCredits.trackId, trackIds));

const creditsByTrack = new Map<string, typeof allCredits>();
for (const credit of allCredits) {
  const list = creditsByTrack.get(credit.trackId) ?? [];
  if (!creditsByTrack.has(credit.trackId)) {
    creditsByTrack.set(credit.trackId, list);
  }
  list.push(credit);
}
```

独立した複数クエリは`Promise.all`で並列実行:

```typescript
const [credits, tags, genres] = await Promise.all([
  db.select().from(trackCredits).where(eq(trackCredits.trackId, id)),
  db.select().from(trackTags).where(eq(trackTags.trackId, id)),
  db.select().from(trackGenres).where(eq(trackGenres.trackId, id)),
]);
```

## COUNT最適化

### 概算カウント（統計・ダッシュボード用）

`COUNT(*)`のシーケンシャルスキャンを回避。`pg_class.reltuples`で近似値を使用。

```typescript
const result = await db.execute<{ relname: string; reltuples: string }>(
  sql`SELECT relname, reltuples::bigint AS reltuples
      FROM pg_class WHERE relname = ANY(${tableNames})`,
);
// reltuplesが負（未ANALYZE）の場合は0にフォールバック
counts.set(row.relname, Math.max(0, Number(row.reltuples)));
```

- VACUUM/ANALYZEで更新される統計値
- ダッシュボード等の正確性が不要な場面で使用
- キャッシュと併用で高速化

### 正確なCOUNT

相関サブクエリを避け、導出テーブル + LEFT JOINを使用:

```typescript
const releaseCounts = db
  .select({ circleId: releases.circleId, count: count() })
  .from(releases).groupBy(releases.circleId).as("rc");

db.select({ name: circles.name, count: releaseCounts.count })
  .from(circles).leftJoin(releaseCounts, eq(circles.id, releaseCounts.circleId));
```

## バッチ操作

### 一括INSERT

```typescript
const BATCH_SIZE = 1000;
for (let i = 0; i < items.length; i += BATCH_SIZE) {
  await tx.insert(table).values(items.slice(i, i + BATCH_SIZE));
}
```

### バッチUPSERT

`onConflictDoUpdate` + `excluded`で原子的upsert:

```typescript
await tx.insert(circles).values(data).onConflictDoUpdate({
  target: circles.name,
  set: {
    nameJa: sql.raw(`excluded.${circles.nameJa.name}`),
    nameEn: sql.raw(`excluded.${circles.nameEn.name}`),
  },
});
```

`sql`インポート（drizzle-orm）が`excluded.column_name`参照に必要。

## SELECT最適化

必要なカラムのみ取得。存在チェックはIDのみ + `limit(1)`:

```typescript
const exists = await db.select({ id: releases.id })
  .from(releases).where(eq(releases.id, id)).limit(1);
```

## TRUNCATE

テーブルクリアはDROP+CREATEではなくTRUNCATE CASCADE:

```typescript
await db.execute(sql`TRUNCATE TABLE ${table} CASCADE`);
```

- シーケンスもリセットされる
- 外部キー依存テーブルも自動クリア（CASCADE）

---
paths: packages/db/**
---

# スキーマ設計（PostgreSQL）

## PostgreSQL型の使い分け

| 用途 | 使うべき型 | 使わない |
|------|-----------|---------|
| 日付 | `date("col", { mode: "string" })` | `text`, `integer` |
| JSON | `jsonb("col").$type<T>()` | `text` + JSON.parse |
| タイムスタンプ | `timestamp("col", { withTimezone: true })` | `timestamp`（TZなし） |
| 列挙値 | `pgEnum` | `text` + CHECK |

**jsonb注意**: API層でJSON.parse/stringifyは不要。Drizzleが自動変換する。

## タイムスタンプパターン

全テーブルで統一:

```typescript
createdAt: timestamp("created_at", { withTimezone: true })
  .defaultNow().notNull(),
updatedAt: timestamp("updated_at", { withTimezone: true })
  .defaultNow().$onUpdate(() => new Date()).notNull(),
```

## インデックス設計

### pg_trgm GINインデックス（ILIKE検索用）

テキスト検索カラムには必須。マイグレーションで`pg_trgm`拡張を有効化。

```typescript
index("idx_artists_name_trgm").using(
  "gin", sql`${table.name} gin_trgm_ops`
),
```

対象: `name`, `name_ja`, `name_en`等の検索対象カラム

### 関数インデックス（大文字小文字無視）

```typescript
index("idx_artists_name_lower").on(sql`lower(${table.name})`),
```

### 複合インデックス

左端カラムから順に絞り込み効率が高いカラムを配置:

```typescript
// 年月での絞り込み
index("idx_releases_year_month").on(table.releaseYear, table.releaseMonth),

// トラック順序（release → disc → track）
index("idx_tracks_ordering").on(table.releaseId, table.discId, table.trackNumber),

// 双方向検索用: (A,B) と (B,A) 両方作成
index("idx_track_credits_track_artist").on(table.trackId, table.artistId),
index("idx_track_credits_artist_track").on(table.artistId, table.trackId),
```

### 部分ユニークインデックス（WHERE句付き）

条件付きユニーク制約に使用:

```typescript
// NULL有無で分岐
uniqueIndex("uq_tracks_release_tracknumber")
  .on(table.releaseId, table.trackNumber)
  .where(sql`${table.discId} IS NULL`),
uniqueIndex("uq_tracks_disc_tracknumber")
  .on(table.discId, table.trackNumber)
  .where(sql`${table.discId} IS NOT NULL`),
// フラグ単一性の保証
uniqueIndex("uq_release_jan_codes_primary")
  .on(table.releaseId)
  .where(sql`${table.isPrimary} = true`),
```

### JSONB GINインデックス

```typescript
index("idx_tags_attributes_gin").using("gin", table.attributes),
```

### 外部キーインデックス

**全FK列にインデックスを付与すること**。JOINとカスケード削除のパフォーマンスに必須。

## CHECK制約

データバリデーションはDB層で保証:

```typescript
check("check_release_year",
  sql`"release_year" >= 1900 AND "release_year" <= 2200`),
check("check_release_month",
  sql`"release_month" >= 1 AND "release_month" <= 12`),
check("check_release_day",
  sql`"release_day" >= 1 AND "release_day" <= 31`),
check("check_track_tags_position",
  sql`"position" >= 1 AND "position" <= 15`),
```

- 範囲制約（年月日、ポジション等）はCHECKで強制
- アプリ層バリデーションと二重で保護

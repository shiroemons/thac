# Phase 5: ハイブリッドページのダイアログ化

## 概要

`releases_.$id.tsx` と `tracks_.$id.tsx` は、メイン情報の編集に加えて多数の関連エンティティ（ディスク、クレジット、公開リンクなど）を管理するハイブリッドページです。これらのページのメイン情報編集をダイアログベースに変換する手順を記載します。

## 対象ファイル

| ファイル | 状態 | ダイアログコンポーネント |
|----------|------|------------------------|
| `apps/web/src/routes/admin/_admin/releases_.$id.tsx` | 未着手 | `ReleaseEditDialog`（作成済み） |
| `apps/web/src/routes/admin/_admin/tracks_.$id.tsx` | 未着手 | `TrackEditDialog`（作成済み） |

## 作成済みコンポーネント

### ReleaseEditDialog

**ファイル**: `apps/web/src/components/admin/release-edit-dialog.tsx`

**Props**:
```typescript
interface ReleaseEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  release: Release;
  onSuccess?: () => void;
}
```

**フィールド**:
- name（必須）
- nameJa
- nameEn
- releaseType
- releaseDate
- eventId（SearchableSelect）
- eventDayId（SearchableSelect、イベント選択後に有効化）
- notes

### TrackEditDialog

**ファイル**: `apps/web/src/components/admin/track-edit-dialog.tsx`

**Props**:
```typescript
interface TrackEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track;
  onSuccess?: () => void;
}
```

**フィールド**:
- name（必須）
- trackNumber（必須）
- nameJa
- nameEn

---

## releases_.$id.tsx の変換手順

### 1. インポートの追加

```typescript
import { ReleaseEditDialog } from "@/components/admin/release-edit-dialog";
```

### 2. 不要なインポートの削除

以下のインポートを削除（ダイアログに移動済み）:
- `Textarea`
- `type Release`, `type ReleaseType`, `releasesApi`（api-clientから）

### 3. 状態の変更

**Before**:
```typescript
const [isEditing, setIsEditing] = useState(false);
const [editForm, setEditForm] = useState<Partial<Release>>({});
const [isSubmitting, setIsSubmitting] = useState(false);
const [mutationError, setMutationError] = useState<string | null>(null);
```

**After**:
```typescript
const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
```

### 4. 関数の削除

以下の関数を削除:
- `startEditing`
- `cancelEditing`
- `handleSave`
- `RELEASE_TYPE_OPTIONS` 定数

### 5. ヘッダーボタンの変更

**Before**:
```tsx
{!isEditing ? (
  <Button variant="outline" size="sm" onClick={startEditing}>
    <Pencil className="mr-2 h-4 w-4" />
    編集
  </Button>
) : (
  <div className="flex items-center gap-2">
    <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={isSubmitting}>
      キャンセル
    </Button>
    <Button variant="primary" size="sm" onClick={handleSave} disabled={isSubmitting || !editForm.name}>
      {isSubmitting ? "保存中..." : "保存"}
    </Button>
  </div>
)}
```

**After**:
```tsx
<Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
  <Pencil className="mr-2 h-4 w-4" />
  編集
</Button>
```

### 6. インライン編集フォームの削除

基本情報カード内の `{isEditing ? <EditForm /> : <DisplayView />}` パターンを削除し、常に `<DisplayView />` のみ表示。

### 7. ダイアログの追加

ファイル末尾（他のダイアログの近く）に追加:

```tsx
<ReleaseEditDialog
  open={isEditDialogOpen}
  onOpenChange={setIsEditDialogOpen}
  release={release}
  onSuccess={invalidateQuery}
/>
```

---

## tracks_.$id.tsx の変換手順

### 1. インポートの追加

```typescript
import { TrackEditDialog } from "@/components/admin/track-edit-dialog";
```

### 2. 状態の変更

**Before**:
```typescript
// 編集関連の状態
const [isEditing, setIsEditing] = useState(false);
const [editForm, setEditForm] = useState<Partial<Track>>({});
const [isSubmitting, setIsSubmitting] = useState(false);
const [mutationError, setMutationError] = useState<string | null>(null);
```

**After**:
```typescript
// 編集ダイアログ
const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

// 各種ダイアログ用（既存のダイアログで使用）
const [isSubmitting, setIsSubmitting] = useState(false);
const [mutationError, setMutationError] = useState<string | null>(null);
```

### 3. 関数の変更

**削除**:
- `startEditing`
- `cancelEditing`
- `handleSave`

**追加**:
```typescript
const invalidateTrackQuery = () => {
  queryClient.invalidateQueries({ queryKey: ["track", trackId] });
};
```

### 4. ヘッダーボタンの変更

**Before**:
```tsx
{!isEditing ? (
  <Button variant="outline" size="sm" onClick={startEditing}>
    <Pencil className="mr-1 h-4 w-4" />
    編集
  </Button>
) : (
  <div className="flex items-center gap-2">
    <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={isSubmitting}>
      キャンセル
    </Button>
    <Button variant="primary" size="sm" onClick={handleSave} disabled={isSubmitting || !editForm.name}>
      {isSubmitting ? "保存中..." : "保存"}
    </Button>
  </div>
)}
```

**After**:
```tsx
<Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
  <Pencil className="mr-1 h-4 w-4" />
  編集
</Button>
```

### 5. インライン編集フォームの削除

トラック情報カード内の `{isEditing ? ... : ...}` パターンを削除し、常に表示モードのみ。

### 6. ダイアログの追加

ファイル末尾（他のダイアログの近く）に追加:

```tsx
<TrackEditDialog
  open={isEditDialogOpen}
  onOpenChange={setIsEditDialogOpen}
  track={track}
  onSuccess={invalidateTrackQuery}
/>
```

---

## 注意事項

1. **既存のダイアログはそのまま維持**: クレジット、原曲紐付け、派生関係、公開リンク、ISRC、ディスク、JAN コードなどの関連エンティティ用ダイアログは変更不要

2. **isSubmitting と mutationError の保持**: tracks_.$id.tsx では他のダイアログ（クレジット追加など）でこれらの状態を使用しているため、削除しない

3. **型チェックの実行**: 変更後は必ず `make check-types` で型エラーがないことを確認

4. **Lint/フォーマット**: `make check` でコードスタイルを確認

---

## 関連ファイル

- `apps/web/src/components/admin/release-edit-dialog.tsx` - リリース編集ダイアログ
- `apps/web/src/components/admin/track-edit-dialog.tsx` - トラック編集ダイアログ
- `apps/web/src/lib/api-client.ts` - API クライアント（tracksApi, releasesApi）

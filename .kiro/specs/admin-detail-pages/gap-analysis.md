# ギャップ分析レポート

## 1. 分析概要

本分析は、管理画面の詳細画面追加機能について、既存コードベースと要件のギャップを調査したものである。

### 1.1 対象エンティティ
- アーティスト（artists）
- サークル（circles）
- イベント（events）
- イベントシリーズ（event-series）

### 1.2 既存の詳細画面
- `releases_.$id.tsx` - 作品詳細（ディスク、トラック、サークル管理含む）
- `tracks_.$id.tsx` - トラック詳細（クレジット管理含む）

---

## 2. 既存コンポーネント・パターン分析

### 2.1 詳細画面の共通パターン

既存の詳細画面から抽出したパターン：

```typescript
// ルート定義
export const Route = createFileRoute("/admin/_admin/[entity]_/$id")({
  loader: ({ params }) => api.get(params.id),
  head: ({ loaderData }) => createDetailHead(loaderData?.name),
  component: DetailPage,
});
```

**レイアウト構成：**
1. `AdminPageHeader` - タイトル・パンくず
2. 基本情報カード - 編集可能なフォーム
3. 関連データセクション - テーブル形式
4. アクションリンク - 一覧へ戻るボタンなど

### 2.2 利用可能な共通コンポーネント

| コンポーネント | 用途 | 場所 |
|---|---|---|
| `AdminPageHeader` | ページタイトル・パンくず | `@/components/admin/admin-page-header` |
| `Table`, `TableRow`, etc. | テーブル表示 | `@/components/ui/table` |
| `Badge` | ラベル・ステータス表示 | `@/components/ui/badge` |
| `Button` | アクションボタン | `@/components/ui/button` |
| `Dialog` | モーダルダイアログ | `@/components/ui/dialog` |
| `Input`, `Label`, etc. | フォーム要素 | `@/components/ui/*` |

### 2.3 API クライアント

`apps/web/src/lib/api-client.ts` で以下のAPIが利用可能：

- `artistsApi.get(id)` - アーティスト詳細取得
- `circlesApi.get(id)` - サークル詳細取得（リンク含む）
- `eventsApi.get(id)` - イベント詳細取得（開催日含む）
- `eventSeriesApi.get(id)` - イベントシリーズ詳細取得（要確認）

### 2.4 Head ユーティリティ

`apps/web/src/lib/head.ts` の既存パターン：

```typescript
export function createTrackDetailHead(trackName?: string, releaseName?: string) {
  const subtitle = trackName && releaseName ? `${trackName} - ${releaseName}` : "読み込み中";
  return {
    meta: [{ title: `トラック詳細：${subtitle} | ${APP_NAME}` }],
  };
}
```

---

## 3. ギャップ分析

### 3.1 不足しているフロントエンドコンポーネント

| 項目 | 状態 | 必要な作業 |
|---|---|---|
| アーティスト詳細画面 | ❌ 未実装 | 新規作成 |
| サークル詳細画面 | ❌ 未実装 | 新規作成 |
| イベント詳細画面 | ❌ 未実装 | 新規作成 |
| イベントシリーズ詳細画面 | ❌ 未実装 | 新規作成 |
| 一覧画面のEyeアイコン | ❌ 未実装 | 4ファイル修正 |

### 3.2 不足しているユーティリティ

| 項目 | 状態 | 必要な作業 |
|---|---|---|
| `createArtistDetailHead` | ❌ 未実装 | head.ts に追加 |
| `createCircleDetailHead` | ❌ 未実装 | head.ts に追加 |
| `createEventDetailHead` | ❌ 未実装 | head.ts に追加 |
| `createEventSeriesDetailHead` | ❌ 未実装 | head.ts に追加 |

### 3.3 APIエンドポイント

| エンドポイント | 状態 | 備考 |
|---|---|---|
| `GET /admin/artists/:id` | ✅ 存在 | 別名義を含むか要確認 |
| `GET /admin/circles/:id` | ✅ 存在 | リンク情報を含む |
| `GET /admin/events/:id` | ✅ 存在 | 開催日情報を含む |
| `GET /admin/event-series/:id` | ⚠️ 要確認 | イベント一覧を含むか確認 |

### 3.4 関連データ取得の必要性

各詳細画面で表示する関連データ：

| エンティティ | 関連データ | 取得方法 |
|---|---|---|
| アーティスト | 別名義（aliases） | APIで取得（要確認） |
| アーティスト | クレジット済みトラック | 追加クエリが必要 |
| サークル | 外部リンク（links） | 既存APIで取得可能 |
| サークル | リリース作品 | 追加クエリが必要 |
| イベント | 開催日（days） | 既存APIで取得可能 |
| イベント | 頒布作品 | 追加クエリが必要 |
| イベントシリーズ | 所属イベント | 追加クエリが必要 |

---

## 4. 実装アプローチの選択肢

### 4.1 オプションA: 最小実装（推奨）

**概要:** 基本情報のみ表示し、関連データは既存APIを使用

**メリット:**
- 実装工数が少ない
- 既存パターンの再利用が容易
- バックエンド変更が最小限

**デメリット:**
- 一部の関連データ（トラッククレジット、作品一覧など）が表示できない

**対象スコープ:**
- アーティスト: 基本情報 + 別名義（APIに含まれている場合）
- サークル: 基本情報 + 外部リンク
- イベント: 基本情報 + 開催日
- イベントシリーズ: 基本情報

### 4.2 オプションB: 完全実装

**概要:** 要件に記載された全ての関連データを表示

**メリット:**
- 要件を完全に満たす
- 管理者の利便性が高い

**デメリット:**
- 追加のAPIエンドポイントまたはクエリが必要
- 実装工数が多い

**追加で必要な作業:**
- アーティストのクレジット済みトラック一覧API
- サークルのリリース作品一覧API
- イベントの頒布作品一覧API
- イベントシリーズの所属イベント一覧API

### 4.3 オプションC: 段階的実装

**概要:** オプションAを先行実装し、後続で関連データを追加

**メリット:**
- 早期にリリース可能
- 優先度に応じた機能追加が可能

**フェーズ分け案:**
1. フェーズ1: 基本情報 + 既存APIで取得可能な関連データ
2. フェーズ2: 追加の関連データ（新規API必要）

---

## 5. 技術的な考慮事項

### 5.1 ルーティング

TanStack Router のファイルベースルーティングに従う：

```
apps/web/src/routes/admin/_admin/
├── artists_.$id.tsx      # /admin/artists/:id
├── circles_.$id.tsx      # /admin/circles/:id
├── events_.$id.tsx       # /admin/events/:id
└── event-series_.$id.tsx # /admin/event-series/:id
```

### 5.2 データフェッチング戦略

- **loader**: ルート遷移時に必須データを取得
- **useQuery**: ページ内で追加データを遅延取得（関連データ用）

### 5.3 エラーハンドリング

既存パターンに従い、以下を実装：
- ローディング状態: `<span className="loading loading-spinner" />`
- エラー状態: `<div className="alert alert-error">`
- 存在しない場合: エラーメッセージ + 一覧へのリンク

---

## 6. 推奨事項

### 6.1 実装順序

1. head.ts にヘルパー関数を追加
2. 一覧画面にEyeアイコンを追加（4ファイル）
3. 詳細画面を作成（既存APIで対応可能な範囲）
   - サークル詳細（リンク表示あり）
   - イベント詳細（開催日表示あり）
   - アーティスト詳細
   - イベントシリーズ詳細
4. （オプション）追加の関連データ表示

### 6.2 参照すべき既存コード

- `tracks_.$id.tsx` - クレジット管理の参考（将来拡張時）
- `releases_.$id.tsx` - 関連データ管理の参考
- `circles.tsx` - 外部リンク編集ダイアログの参考（既存）

### 6.3 設計フェーズでの確認事項

1. `eventSeriesApi.get(id)` が所属イベント一覧を返すか確認
2. `artistsApi.get(id)` が別名義一覧を返すか確認
3. 関連データ（トラック、作品）の表示が必須かユーザーに確認

---

## 7. まとめ

既存のコードベースには詳細画面を実装するための基盤が整っており、パターンも確立されている。

**主なギャップ:**
- 4つの詳細画面ルートが未実装
- 一覧画面にEyeアイコンが未実装
- head.ts に詳細画面用ヘルパー関数が未実装

**推奨アプローチ:**
オプションC（段階的実装）を採用し、まず既存APIで対応可能な範囲で実装を完了させることを推奨する。追加の関連データ表示は、必要性を確認した上で後続フェーズで対応する。


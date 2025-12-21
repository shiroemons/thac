# Research & Design Decisions

## Summary
- **Feature**: `admin-detail-pages`
- **Discovery Scope**: Simple Addition（既存パターンに従うUI拡張）
- **Key Findings**:
  - 既存の詳細画面パターン（releases, tracks）が再利用可能
  - `eventSeriesApi.get()` メソッドが未実装のため追加が必要
  - 関連データ表示（トラッククレジット、作品一覧）は追加APIが必要なため段階的実装を推奨

## Research Log

### 既存詳細画面パターン分析
- **Context**: 新規詳細画面の設計指針を確立するため
- **Sources Consulted**:
  - `apps/web/src/routes/admin/_admin/releases_.$id.tsx`
  - `apps/web/src/routes/admin/_admin/tracks_.$id.tsx`
- **Findings**:
  - ルート定義: `loader` + `head` + `component` の3要素構成
  - データ取得: `loader` で初期データ、`useQuery` で追加データ
  - レイアウト: `AdminPageHeader` → 基本情報 → 関連データ
  - エラー処理: `notFound()` でリダイレクト
- **Implications**: 4つの新規画面も同一パターンで実装可能

### APIクライアント調査
- **Context**: 詳細画面に必要なAPI有無を確認
- **Sources Consulted**: `apps/web/src/lib/api-client.ts`
- **Findings**:
  - `artistsApi.get(id)`: ✅ 存在（`Artist` 型を返す）
  - `circlesApi.get(id)`: ✅ 存在（`CircleWithLinks` 型を返す）
  - `eventsApi.get(id)`: ✅ 存在（`EventWithDays` 型を返す）
  - `eventSeriesApi.get(id)`: ❌ 未実装
- **Implications**: `eventSeriesApi.get()` を追加する必要がある

### Head ユーティリティ調査
- **Context**: ブラウザタブタイトルの設定方法を確認
- **Sources Consulted**: `apps/web/src/lib/head.ts`
- **Findings**:
  - 既存: `createPageHead`, `createReleaseDetailHead`, `createTrackDetailHead`
  - パターン: `{画面種類}：{名前} | 東方編曲録`
- **Implications**: 4つの新規ヘルパー関数を追加

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存パターン踏襲 | releases/tracks と同じ構成 | 一貫性、学習コスト低 | なし | 採用 |

## Design Decisions

### Decision: 段階的実装アプローチ
- **Context**: 関連データ（トラッククレジット、作品一覧）の表示には追加APIが必要
- **Alternatives Considered**:
  1. 全機能一括実装 — 追加APIも含めて実装
  2. 段階的実装 — 既存APIで対応可能な範囲から着手
- **Selected Approach**: 段階的実装
- **Rationale**: 早期リリース可能、バックエンド変更を最小化
- **Trade-offs**: 一部の関連データは初期リリースで表示されない
- **Follow-up**: 関連データ表示は別specで対応

### Decision: Eye アイコンの配置
- **Context**: 一覧画面から詳細画面への遷移方法
- **Alternatives Considered**:
  1. 行クリックで遷移
  2. Eye アイコンボタンを追加
- **Selected Approach**: Eye アイコンボタン
- **Rationale**:
  - 既存の編集（Pencil）・削除（Trash2）と一貫性
  - 誤操作防止（行クリックは意図しない遷移を招く可能性）
- **Trade-offs**: クリック対象が小さい

## Risks & Mitigations
- **eventSeriesApi.get() 未実装** — フロントエンドとバックエンド両方で追加が必要。タスクに含める。
- **関連データ表示の不完全性** — 初期リリースでは基本情報と既存APIで取得可能な関連データのみ表示。ユーザーへ明示。

## References
- [TanStack Router - File-Based Routing](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)
- `.kiro/steering/admin.md` — 管理画面デザインガイドライン

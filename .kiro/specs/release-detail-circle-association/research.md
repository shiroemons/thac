# Research & Design Decisions

## Summary
- **Feature**: `release-detail-circle-association`
- **Discovery Scope**: Extension（既存の作品管理機能に詳細画面とサークル関連付けを追加）
- **Key Findings**:
  - `releaseCircles`テーブルは既存。複合主キー `(releaseId, circleId, participationType)` で管理
  - `discsRouter`パターンを踏襲してサークル関連APIを実装可能
  - TanStack Routerの動的ルート（`$id.tsx`）で詳細画面を実装

## Research Log

### TanStack Routerの動的ルートパターン
- **Context**: 作品詳細画面のルート設計
- **Sources Consulted**: TanStack Router公式ドキュメント、既存ルート構造
- **Findings**:
  - ファイルベースルーティングで`$id.tsx`形式を使用
  - `Route.useParams()`でパラメータ取得
  - `loaderDeps`でパラメータに基づくデータ取得が可能
- **Implications**: `apps/web/src/routes/admin/_admin/releases/$id.tsx`として実装

### 既存ネストリソースAPI（discsRouter）パターン
- **Context**: サークル関連付けAPIの設計基盤
- **Sources Consulted**: `apps/server/src/routes/admin/releases/discs.ts`
- **Findings**:
  - `/:releaseId/discs`パターンでネストリソースを表現
  - 親リソース存在チェックを各エンドポイントで実施
  - Zodスキーマによるバリデーション
  - 201/200/404/409のステータスコード使用
- **Implications**: `/:releaseId/circles`で同様のパターンを適用

### releaseCirclesスキーマ構造
- **Context**: 複合主キーと関連付けロジック
- **Sources Consulted**: `packages/db/src/schema/release.ts`
- **Findings**:
  - 主キー: `(releaseId, circleId, participationType)`
  - `participationType`は必須（同一サークルでも参加形態が異なれば複数登録可能）
  - `position`はデフォルト1（順序管理用）
  - カスケード削除設定済み（release削除時に関連も削除）
- **Implications**: PATCH/DELETEはparticipationTypeも識別子として必要

### 順序変更UI
- **Context**: 関連サークルの表示順変更方法
- **Sources Consulted**: daisyUIコンポーネント、既存UI
- **Findings**:
  - ドラッグ&ドロップには追加ライブラリ（`@dnd-kit/core`等）が必要
  - 上下ボタン（ChevronUp/Down）はアイコンのみで実装可能
  - 初期実装は上下ボタンで十分
- **Implications**: MVP段階では上下ボタン、将来的にDnD対応を検討

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Option A: 既存拡張 | releases.tsxにタブ追加 | ファイル数維持 | 887行がさらに肥大化 | 非推奨 |
| Option B: 新規ルート | $id.tsxとして分離 | 責務分離、保守性向上 | ファイル増加 | **採用** |

## Design Decisions

### Decision: 詳細画面ルート構成
- **Context**: 作品詳細画面をどのように構成するか
- **Alternatives Considered**:
  1. モーダル/ダイアログ拡張 — 既存の編集ダイアログを拡張
  2. 新規ルート — `/admin/releases/$id`として独立ページ
- **Selected Approach**: 新規ルート
- **Rationale**: 詳細画面は情報量が多く、ディスク・サークル管理を含むため専用ページが適切
- **Trade-offs**: ナビゲーション増加 vs 画面の広さと操作性
- **Follow-up**: パンくずナビゲーションで導線を明確化

### Decision: サークル関連付けAPI設計
- **Context**: サークル関連付けのエンドポイント設計
- **Alternatives Considered**:
  1. `/releases/:id/circles` — リリースのサブリソース
  2. `/release-circles` — 独立リソース
- **Selected Approach**: `/releases/:id/circles`（サブリソース）
- **Rationale**: discsRouterと一貫したパターン、リリースとの関連が明確
- **Trade-offs**: URLが長くなる vs 直感的なAPI構造
- **Follow-up**: 複合主キーのためcircleIdだけでなくparticipationTypeも識別に使用

### Decision: 順序変更UI
- **Context**: 関連サークルの表示順変更方法
- **Alternatives Considered**:
  1. ドラッグ&ドロップ — 直感的だが追加ライブラリ必要
  2. 上下ボタン — シンプル、追加依存なし
- **Selected Approach**: 上下ボタン（MVP）
- **Rationale**: 追加ライブラリなしで実装可能、サークル数は通常少数
- **Trade-offs**: UX vs 実装コスト
- **Follow-up**: 将来的にDnD対応を検討（多数サークル時）

### Decision: participationType（参加形態）フィールド設計
- **Context**: 要件3.4では「役割を任意で設定可能」だが、DBスキーマでは必須
- **Alternatives Considered**:
  1. 役割ベース（production, arrangement, vocal...） — 機能的な役割
  2. 関係性ベース（host, participant, guest...） — サークルと作品の関係
- **Selected Approach**: 関係性ベースの参加形態（デフォルト: `host`）
- **Rationale**:
  - 同人音楽の文脈でサークルと作品の関係を正確に表現
  - 「誰が主催か」「誰が参加か」が明確になる
  - コンピ、スプリット、コラボなど多様な作品形態に対応
- **Trade-offs**: 固定選択肢による柔軟性低下 vs ドメインモデルの正確性
- **Follow-up**: 選択肢追加は将来対応可能な設計

**ParticipationType 選択肢**:
| 値 | ラベル | 用途 |
|----|--------|------|
| `host` | 主催 | 単独作品、コンピ主催（デフォルト） |
| `co-host` | 共同主催 | A × B 名義のコラボ |
| `participant` | 参加 | コンピ参加 |
| `guest` | ゲスト | ゲストボーカル招待など |
| `split_partner` | スプリット | 2サークルのスプリット作品 |

### Decision: カラム名変更 role → participation_type
- **Context**: `role`という名前は曖昧で、何の役割か分かりづらい
- **Alternatives Considered**:
  1. DBカラム名変更 — `role` → `participation_type`（マイグレーション必要）
  2. カラム名維持 — アプリ層のみ名称変更
- **Selected Approach**: DBカラム名変更（Option A）
- **Rationale**:
  - コードの可読性と保守性向上
  - 「サークルがどのように参加しているか」を明確に表現
  - 早期段階での変更は影響範囲が限定的
- **Trade-offs**: マイグレーション作業 vs コードベースの一貫性
- **Follow-up**:
  - DBマイグレーションを実装タスクに追加
  - スキーマ定義とバリデーションスキーマも更新

## Risks & Mitigations
- **Risk**: 複合主キー操作の複雑さ — participationTypeを含む識別子管理が必要
  - **Mitigation**: API設計でparticipationTypeを明示的に扱う
- **Risk**: 既存releases.tsxとの機能重複 — 編集ダイアログと詳細画面の役割分担
  - **Mitigation**: 一覧での簡易編集は維持、詳細編集は詳細画面に集約

## References
- [TanStack Router - File-Based Routing](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)
- [Drizzle ORM - Composite Primary Keys](https://orm.drizzle.team/docs/indexes-constraints#composite-primary-key)

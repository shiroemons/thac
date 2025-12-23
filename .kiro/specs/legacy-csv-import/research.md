# Research & Design Decisions: レガシーCSVインポート

## Summary
- **Feature**: `legacy-csv-import`
- **Discovery Scope**: Extension（既存システムへの機能追加）
- **Key Findings**:
  - 既存のCSVパーサーとインポートパターンが再利用可能
  - eventSeriesIdのnullable化がスキーマ変更として必須
  - 原曲マッチングには段階的アルゴリズム（完全一致→部分一致→手動選択）が最適

---

## Research Log

### CSVパーサー既存実装調査

- **Context**: レガシーCSVのパース要件と既存実装の互換性確認
- **Sources Consulted**:
  - `apps/server/src/utils/import-parser.ts`
  - `apps/server/src/routes/admin/master/import.ts`
- **Findings**:
  - `parseCSV`関数はカンマ区切り、クォート対応済み
  - `parseTSV`、`parseJSON`も利用可能
  - `validateRows`でZodスキーマによる全行バリデーション
  - **未対応**: 重複ヘッダー行スキップ、コロン区切り複数値、「×」区切りサークル分割
- **Implications**:
  - 既存パーサーを拡張するよりも、レガシーCSV専用パーサーを新規作成が適切
  - 汎用性を損なわずに特殊フォーマット対応が可能

### 原曲マッチングアルゴリズム検討

- **Context**: CSV内の原曲名を公式楽曲DBと照合する最適手法
- **Sources Consulted**:
  - SQLite LIKE演算子仕様
  - 文字列類似度アルゴリズム（Levenshtein、Jaro-Winkler）
- **Findings**:
  - 東方楽曲名は日本語特有の表記揺れが多い（「～」「〜」、全角半角など）
  - 完全一致 → 部分一致（LIKE）の2段階で大半のケースをカバー可能
  - Levenshtein距離はオーバーキル（実装コスト > 効果）
  - 「オリジナル」は特殊ケースとして事前処理
- **Implications**:
  - 段階的マッチング: 完全一致 → 前方/後方一致 → 部分一致
  - マッチしない場合は手動選択UIで対応
  - 類似度スコアリングは将来拡張として保留

### eventSeriesId nullable化の影響調査

- **Context**: イベントをeventSeriesなしで登録可能にするためのスキーマ変更
- **Sources Consulted**:
  - `packages/db/src/schema/event.ts`
  - `packages/db/src/schema/event.validation.ts`
  - `apps/server/src/routes/admin/events/events.ts`
- **Findings**:
  - 現在: `eventSeriesId: text("event_series_id").notNull()`
  - バリデーション: `eventSeriesId: nonEmptyString`（必須）
  - イベントAPI: seriesIdでのフィルタリングあり（影響なし、LEFT JOINで対応済み）
  - ユニーク制約: `uq_events_series_edition`（eventSeriesId + edition）→ null時は制約から除外される
- **Implications**:
  - スキーマ変更は`.notNull()`削除のみ
  - バリデーションスキーマを`.optional()`に変更
  - 既存APIへの影響は最小限

### トラッククレジット構造調査

- **Context**: CSVのartists列をtrackCredits + trackCreditRolesに変換する方法
- **Sources Consulted**:
  - `packages/db/src/schema/track.ts`
- **Findings**:
  - `trackCredits`: trackId + artistId + creditName + aliasTypeCode
  - `trackCreditRoles`: trackCreditId + roleCode + rolePosition
  - roleCode例: `vocalist`, `arranger`, `lyricist`
  - 1アーティストが複数ロールを持つ場合は別レコード
- **Implications**:
  - CSVの`vocalists`列 → roleCode=`vocalist`
  - CSVの`arrangers`列 → roleCode=`arranger`
  - CSVの`lyricists`列 → roleCode=`lyricist`
  - creditNameはCSVのアーティスト名をそのまま使用

### UI状態管理パターン調査

- **Context**: 3ステップウィザードの状態管理方法
- **Sources Consulted**:
  - 既存管理画面のパターン（TanStack Query使用）
  - React状態管理ベストプラクティス
- **Findings**:
  - 既存: TanStack Queryでサーバー状態管理
  - ウィザード: ローカル状態でステップ間データ保持が適切
  - 大量データ: useStateでの保持は問題なし（メモリ上のオブジェクト）
- **Implications**:
  - ステップ間データはReact useStateで管理
  - APIコールはステップ遷移時（preview → mapping → execute）
  - 戻るボタンで状態復元可能

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Option A: 既存拡張 | import-parser.tsとimport-dialog.tsxを拡張 | 既存パターン再利用 | 責務肥大化、複雑化 | 不採用 |
| **Option B: 新規分離** | 専用パーサー、サービス、UIコンポーネントを新規作成 | 責務分離、テスト容易 | ファイル数増加 | **採用** |
| Option C: ハイブリッド | パーサーのみ既存拡張、他は新規 | 部分的再利用 | 境界不明確 | 不採用 |

---

## Design Decisions

### Decision: 新規コンポーネント分離アプローチ

- **Context**: レガシーCSVインポートは既存インポート機能と要件が大きく異なる
- **Alternatives Considered**:
  1. 既存`import-parser.ts`を拡張 — 汎用性を損なう可能性
  2. 完全新規作成 — 責務明確だがコード増加
  3. ハイブリッド — 境界判断が曖昧
- **Selected Approach**: 完全新規作成（Option B）
- **Rationale**:
  - レガシーCSVは重複ヘッダー、コロン区切り、×区切りなど特殊フォーマット
  - 3ステップウィザードは既存ダイアログと根本的に異なるUX
  - 将来的な他フォーマット対応を考慮
- **Trade-offs**:
  - (+) 既存コードへの影響ゼロ
  - (+) テスト・保守が容易
  - (-) ファイル数増加
- **Follow-up**: 共通化可能な部分は後続リファクタリングで対応

### Decision: 段階的原曲マッチング

- **Context**: CSV内の原曲名を既存公式楽曲DBと照合
- **Alternatives Considered**:
  1. 完全一致のみ — シンプルだがマッチ率低下
  2. 類似度スコアリング — 高精度だが実装コスト大
  3. 段階的マッチング — バランス良好
- **Selected Approach**: 段階的マッチング（完全一致→部分一致→手動選択）
- **Rationale**:
  - 東方楽曲名は表記揺れが多いが、部分一致でほぼカバー可能
  - 「オリジナル」は特殊ケースとして事前処理
  - 手動選択UIで最終的なユーザー確認を保証
- **Trade-offs**:
  - (+) 実装コスト抑制
  - (+) ユーザー確認による精度保証
  - (-) 手動介入が必要なケースあり
- **Follow-up**: マッチング精度のメトリクス収集を検討

### Decision: eventSeriesIdのnullable化

- **Context**: CSVのイベント名からeventSeriesを推測できない場合の対応
- **Alternatives Considered**:
  1. 「不明」eventSeriesを作成して紐付け — データ汚染リスク
  2. インポート時にeventSeriesを必須入力 — UX悪化
  3. eventSeriesIdをnullable化 — スキーマ変更必要
- **Selected Approach**: eventSeriesIdをnullable化
- **Rationale**:
  - イベントは独立して存在可能（シリーズなしでも成立）
  - 後から手動でeventSeriesを紐付け可能
  - 既存データへの影響なし
- **Trade-offs**:
  - (+) 柔軟なデータモデル
  - (+) インポートUXの簡素化
  - (-) マイグレーション実行が必要
- **Follow-up**: イベント一覧画面でeventSeriesなしの表示対応

---

## Risks & Mitigations

| Risk | Level | Mitigation |
|------|-------|------------|
| 原曲マッチング精度不足 | Medium | 手動選択UIで最終確認、マッチなしはスキップ可能 |
| 大量データ時のパフォーマンス | Low | バッチ処理、トランザクション分割を検討 |
| CSVフォーマット変動 | Low | ヘッダー検証で未対応フォーマット検出 |
| トランザクション競合 | Low | 依存順序を明確化、楽観的ロック不要 |
| スキーマ変更の既存影響 | Low | 既存APIはLEFT JOINで対応済み |

---

## References

- [Drizzle ORM - Transactions](https://orm.drizzle.team/docs/transactions) — トランザクション処理パターン
- [TanStack Query](https://tanstack.com/query/latest) — サーバー状態管理
- [daisyUI Steps](https://daisyui.com/components/steps/) — ウィザードUIパターン

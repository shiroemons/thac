# 設計検証レポート: レガシーCSVインポート機能

## 検証サマリー

| 項目 | 結果 |
|------|------|
| **判定** | ✅ **GO** |
| **検証日** | 2025-12-23 |
| **Critical Issues** | 0件 |
| **Minor Issues** | 2件 |
| **Strengths** | 6件 |

---

## 1. 既存アーキテクチャとの整合性

### ✅ 準拠項目

| パターン | 設計での適用 | 判定 |
|----------|--------------|------|
| Hono APIルート | `routes/admin/import/` - 既存`routes/admin/`構造に準拠 | ✅ |
| TanStack Router | `routes/admin/_admin/import/legacy.tsx` - ファイルベースルーティング | ✅ |
| TanStack Query | サーバー状態管理にuseMutationを使用 | ✅ |
| React useState | ウィザードステップ間のローカル状態管理 | ✅ |
| Drizzle ORM | トランザクション内upsertパターン（既存`master/import.ts`と同等） | ✅ |
| Zodバリデーション | リクエスト/レスポンススキーマ定義 | ✅ |
| daisyUI | 既存UIコンポーネントパターン活用 | ✅ |
| @thac/utils | detectInitial関数の再利用 | ✅ |
| Biomeフォーマット | タブインデント、ダブルクォート | ✅ |

### コンポーネント配置

設計で指定されたファイル配置がstructure.mdのパターンに準拠：

```
apps/server/src/routes/admin/import/     ✅ API Routes pattern
apps/server/src/services/                ✅ Service layer (new pattern, appropriate)
apps/server/src/utils/                   ✅ Utility functions pattern
apps/web/src/routes/admin/_admin/import/ ✅ File-based routing pattern
apps/web/src/components/import/          ✅ Component organization pattern
```

---

## 2. 設計の一貫性

### ✅ レイヤー分離

- **UI層**: LegacyImportPage, CSVUploadStep, SongMappingStep, ImportResultStep
- **API層**: ImportRouter（Hono）
- **Service層**: LegacyCSVParser, SongMatcher, LegacyImportService

責務が明確に分離され、単一責任原則に準拠。

### ✅ TypeScript型定義

以下のインターフェースが明確に定義：

- `LegacyCSVRecord` - CSVパース結果の中間表現
- `ParseResult` - パーサー戻り値
- `SongMatchResult` - マッチング結果
- `ImportInput` / `ImportResult` - サービス入出力

型安全性が確保されている。

### ✅ 要件トレーサビリティ

全9要件（Requirement 1-9）が設計コンポーネントにマッピング済み。トレーサビリティマトリクスが完備。

---

## 3. 検出された課題

### Minor Issue 1: ファイルサイズ制限の未定義

**影響**: Low
**内容**: APIエンドポイントのファイルアップロードサイズ制限が設計に明記されていない。
**推奨対応**: 実装時に適切な制限（例: 10MB）を設定し、エラーメッセージをUIに表示。

### Minor Issue 2: 大量データ時のバッチ処理詳細

**影響**: Low
**内容**: 設計で「バッチ分割を検討」と記載されているが、具体的な閾値やバッチサイズが未定義。
**推奨対応**: 実装時に1000レコード/バッチ程度を目安とし、必要に応じて調整。

---

## 4. 設計の強み

### 強み 1: 段階的マッチングアルゴリズム

完全一致 → 部分一致 → 手動選択の3段階アプローチは、実装コストと精度のバランスが優れている。「オリジナル」の特殊処理も適切に考慮。

### 強み 2: 新規コンポーネント分離アプローチ

既存`import-parser.ts`を拡張せず、専用パーサーを新規作成する判断は適切。特殊フォーマット（重複ヘッダー、コロン区切り、×区切り）への対応が独立して保守可能。

### 強み 3: 後方互換なスキーマ変更

`eventSeriesId`のnullable化は既存データに影響せず、ロールバック不要。安全なマイグレーション戦略。

### 強み 4: 包括的なテスト戦略

Unit/Integration/E2Eの3レイヤーでカバレッジ計画が明確。特にトランザクションロールバックのテストが重要。

### 強み 5: 明確なシステムフロー図

Mermaidシーケンス図とフローチャートにより、処理フローが視覚的に理解可能。チーム間のコミュニケーション効率向上。

### 強み 6: 依存関係順序の明確化

7テーブルへの登録順序（events → circles → artists → releases → tracks → trackCredits → trackOfficialSongs）が明確に定義され、参照整合性が保証される。

---

## 5. 拡張性評価

| 拡張シナリオ | 対応可能性 | 備考 |
|--------------|------------|------|
| 他CSVフォーマット対応 | ✅ 容易 | パーサーを追加実装するのみ |
| Excel対応 | ✅ 可能 | 別パーサー追加で対応 |
| 類似度スコアリング強化 | ✅ 可能 | SongMatcherの拡張で対応 |
| バッチ進捗表示 | ⚠️ 要検討 | WebSocket等の追加が必要 |

Non-Goalsに明記されている項目は将来拡張として適切にスコープ外化されている。

---

## 6. 判定

### ✅ GO

設計は以下の理由により承認：

1. **既存アーキテクチャへの完全準拠** - Hono、TanStack、Drizzle等の既存パターンを踏襲
2. **明確な責務分離** - UI/API/Service層が適切に分離
3. **型安全性の確保** - TypeScriptインターフェースが完備
4. **テスト戦略の明確化** - 3レイヤーでのテストカバレッジ計画
5. **安全なマイグレーション** - 後方互換なスキーマ変更

### 次のステップ

```bash
/kiro:spec-tasks legacy-csv-import
```

Minor Issuesは実装フェーズで対応可能であり、設計承認の障害とはならない。

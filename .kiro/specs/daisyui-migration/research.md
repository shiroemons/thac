# Research & Design Decisions

## Summary
- **Feature**: daisyui-migration
- **Discovery Scope**: Extension（既存shadcn/uiシステムからdaisyUIへの移行）
- **Key Findings**:
  - daisyUI 5はTailwindCSS v4と完全互換（CSS-firstアプローチで`@plugin "daisyui"`構文を使用）
  - daisyUIはdata-theme属性によるテーマ切り替えをネイティブサポート（next-themes不要）
  - 既存のRadix UI/class-variance-authority依存はdaisyUIのユーティリティクラスで完全置換可能

## Research Log

### daisyUI + TailwindCSS v4互換性
- **Context**: プロジェクトはTailwindCSS v4を使用しており、daisyUIの互換性確認が必要
- **Sources Consulted**:
  - [daisyUI公式ドキュメント](https://daisyui.com/docs/install/)
  - [daisyUIアップグレードガイド](https://daisyui.com/docs/upgrade/)
  - [GitHub Discussion #2899](https://github.com/saadeghi/daisyui/discussions/2899)
- **Findings**:
  - daisyUI 5がTailwindCSS v4対応版
  - 新しいCSS-first設定方式: `@import "tailwindcss"; @plugin "daisyui";`
  - tailwind.config.jsは不要（オプションでテーマカスタマイズ可能）
  - インストール: `bun add -D daisyui@latest`
- **Implications**:
  - 現在のindex.cssをシンプル化可能
  - shadcn/uiのCSS変数（--background, --foregroundなど）はdaisyUIのテーマカラーに置換

### テーマシステム比較
- **Context**: next-themesからdaisyUIネイティブテーマへの移行方法
- **Sources Consulted**:
  - [daisyUI Themes](https://daisyui.com/docs/themes/)
  - [daisyUI Theme Controller](https://daisyui.com/docs/components/theme-controller/)
- **Findings**:
  - daisyUIは`data-theme`属性でテーマを管理
  - 34個の組み込みテーマ（light, dark, cupcake, cyberpunkなど）
  - `--default`と`--prefersdark`フラグでシステムテーマ連動可能
  - CSS設定例: `themes: light --default, dark --prefersdark;`
  - theme-controllerコンポーネントでUI切り替えを提供
- **Implications**:
  - next-themesパッケージは不要に
  - カスタムuseThemeフックでlocalStorage永続化とdata-theme操作を実装
  - Sonnerコンポーネントはテーマ連動のためuseThemeフックを使用

### コンポーネント移行戦略
- **Context**: 既存shadcn/uiコンポーネントのdaisyUI対応パターン
- **Sources Consulted**:
  - daisyUI公式コンポーネントドキュメント
  - 既存コードベース分析
- **Findings**:
  - **Button**: cvaからdaisyUIの`btn`クラスへ（btn-primary, btn-secondary, btn-outline, btn-ghost, btn-link）
  - **Dialog**: Radix UIからdaisyUIの`modal`へ（checkbox/dialog要素ベース、modal-box, modal-backdrop）
  - **Dropdown**: Radix UIからdaisyUIの`dropdown`へ（CSS/details要素ベース）
  - **Card**: `card`, `card-body`, `card-title`クラス
  - **Table**: `table`, `table-zebra`クラス
  - **Badge**: `badge`, `badge-primary`などのクラス
  - **Input**: `input`, `input-bordered`クラス
  - **Checkbox**: `checkbox`, `checkbox-primary`クラス
  - **Skeleton**: `skeleton`クラス（アニメーション内蔵）
  - **Navbar**: `navbar`, `navbar-start`, `navbar-center`, `navbar-end`
  - **Drawer**: `drawer`, `drawer-toggle`, `drawer-side`, `drawer-content`
- **Implications**:
  - Radix UI依存を完全削除可能
  - class-variance-authorityは不要（daisyUIクラスで直接variant制御）
  - tailwind-mergeはclsxのみで代替可能（daisyUIクラスは競合しない設計）

### 管理画面レイアウト設計
- **Context**: ヘッダーナビゲーションからサイドバーナビゲーションへの変更
- **Sources Consulted**:
  - daisyUI Drawer/Navbar/Menuドキュメント
  - 既存admin-header.tsx分析
- **Findings**:
  - daisyUI drawerはcheckbox toggleでサイドバー開閉を制御
  - `lg:drawer-open`クラスでレスポンシブ対応（デスクトップで常時表示）
  - menuコンポーネントでナビゲーションリンクを構成
  - `menu-active`クラスで現在ページをハイライト
- **Implications**:
  - AdminLayoutコンポーネントを新規作成（drawer + navbar構成）
  - 既存AdminHeaderはAdminNavbar（トップバー）として再構成
  - AdminSidebarコンポーネントでサイドメニューを実装

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| CSS-only Components | daisyUIのCSSクラスのみ使用 | 最軽量、JS不要 | 複雑な状態管理が難しい | シンプルなコンポーネント向け |
| Wrapper Components | daisyUIクラスをラップしたReactコンポーネント | 型安全、既存API互換 | 若干のオーバーヘッド | **選択**: 既存コード互換性維持 |
| Headless + daisyUI | Radix UIのヘッドレス機能を維持 | アクセシビリティ完備 | 依存関係削減の効果が薄い | 今回は不採用 |

## Design Decisions

### Decision: daisyUI 5 + CSS-first設定
- **Context**: TailwindCSS v4との統合方法
- **Alternatives Considered**:
  1. tailwind.config.js方式 — 従来のJS設定ファイル
  2. CSS-first方式 — `@plugin "daisyui"`構文
- **Selected Approach**: CSS-first方式
- **Rationale**: TailwindCSS v4のネイティブ機能、設定ファイル削減、よりシンプルな構成
- **Trade-offs**: 一部の高度なカスタマイズはJS設定が必要な場合あり
- **Follow-up**: テーマカスタマイズが必要な場合はdaisyui-theme.mjsを検討

### Decision: カスタムuseThemeフック
- **Context**: テーマ切り替え機能の実装方法
- **Alternatives Considered**:
  1. next-themes維持 — 既存パッケージを継続使用
  2. daisyUI theme-controller — HTML/CSSのみの実装
  3. カスタムフック — React Context + localStorage
- **Selected Approach**: カスタムuseThemeフック
- **Rationale**: next-themes依存削除、SSR対応、localStorage永続化、システムテーマ連動
- **Trade-offs**: 独自実装のメンテナンスコスト
- **Follow-up**: ThemeProvider/useThemeの実装とテスト

### Decision: Wrapperコンポーネントパターン
- **Context**: 既存コンポーネントAPIの維持方法
- **Alternatives Considered**:
  1. 完全置換 — 全使用箇所でdaisyUIクラスを直接使用
  2. Wrapperパターン — 既存propsインターフェースを維持したラッパー
- **Selected Approach**: Wrapperパターン
- **Rationale**: 既存コードの変更を最小化、型安全性維持、段階的移行が可能
- **Trade-offs**: 追加のコンポーネント層
- **Follow-up**: variant/size propsからdaisyUIクラスへのマッピング実装

### Decision: cn関数のシンプル化
- **Context**: ユーティリティ関数の依存関係
- **Alternatives Considered**:
  1. tailwind-merge維持 — 現状維持
  2. clsxのみ — tailwind-merge削除
- **Selected Approach**: clsxのみ使用
- **Rationale**: daisyUIクラスはTailwindユーティリティクラスと競合しない設計、tailwind-mergeの複雑なマージ処理は不要
- **Trade-offs**: カスタムTailwindクラスの競合時は手動調整が必要
- **Follow-up**: 移行後に競合がないことを確認

## Risks & Mitigations
- **リスク1**: コンポーネントAPI互換性の破壊 — 緩和策: Wrapperパターンで既存propsを維持
- **リスク2**: テーマ切り替え時のフラッシュ（FOUC） — 緩和策: スクリプトで初期テーマを早期適用
- **リスク3**: アクセシビリティの低下 — 緩和策: daisyUIのARIA属性を確認、必要に応じて追加
- **リスク4**: Sonnerのテーマ連動不具合 — 緩和策: useThemeフックと連携したテーマprop設定

## References
- [daisyUI公式ドキュメント](https://daisyui.com/) — 最新v5.5.14
- [daisyUIアップグレードガイド](https://daisyui.com/docs/upgrade/) — v4→v5移行情報
- [TailwindCSS v4互換性](https://tailwindcss.com/docs/compatibility) — フレームワーク互換性
- [GitHub saadeghi/daisyui](https://github.com/saadeghi/daisyui) — ソースコードとIssues

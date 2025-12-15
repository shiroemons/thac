# Requirements Document

## Introduction

本仕様は、apps/webフロントエンドで使用しているUIコンポーネントライブラリをshadcn/uiからdaisyUIへ移行するプロジェクトである。現在、11個のshadcn/uiコンポーネント（button, card, checkbox, dialog, dropdown-menu, input, label, skeleton, badge, table, sonner）がRadix UI primitives、class-variance-authority、tailwind-mergeに依存している。daisyUIはTailwindCSSのプラグインとしてユーティリティクラスベースのコンポーネントを提供し、依存関係の削減とバンドルサイズの最適化を目指す。

さらに、テーマ切り替え機能（システム・ライト・ダーク）、管理画面のサイドバーナビゲーション、モバイル対応UIを実装し、モダンなユーザー体験を提供する。

## Requirements

### Requirement 1: daisyUIの導入とセットアップ

**Objective:** As a 開発者, I want daisyUIをプロジェクトに導入したい, so that TailwindCSSプラグインとしてUIコンポーネントが使用できるようになる

#### Acceptance Criteria
1. The Web App shall daisyUIパッケージを依存関係として含む
2. When TailwindCSS設定ファイルを読み込む際, the Web App shall daisyUIをプラグインとして有効化する
3. The Web App shall daisyUIのデフォルトテーマ（light, dark）を有効化する
4. When アプリケーションをビルドする際, the Web App shall エラーなくビルドを完了する

### Requirement 2: shadcn/ui依存関係の削除

**Objective:** As a 開発者, I want shadcn/uiの関連依存関係を削除したい, so that 不要なパッケージを排除しバンドルサイズを削減できる

#### Acceptance Criteria
1. The Web App shall @radix-ui/react-dialog、@radix-ui/react-slotパッケージを含まない
2. The Web App shall class-variance-authorityパッケージを含まない
3. The Web App shall tailwind-mergeパッケージを含まない（daisyUIで不要な場合）
4. The Web App shall radix-uiパッケージを含まない
5. When 依存関係を削除した後, the Web App shall 型チェックとLintをエラーなく通過する
6. The Web App shall components.json（shadcn/ui設定ファイル）を含まない

### Requirement 3: テーマ切り替え機能

**Objective:** As a ユーザー, I want テーマを切り替えたい, so that 好みの外観でアプリケーションを使用できる

#### Acceptance Criteria
1. The Theme Switcher shall システムテーマ・ライトテーマ・ダークテーマの3つの選択肢を提供する
2. The Theme Switcher shall 各テーマに対応するアイコン（システム: モニター、ライト: 太陽、ダーク: 月）を表示する
3. When ユーザーがテーマを選択した際, the Web App shall 即座にテーマを切り替える
4. The Web App shall 選択したテーマをlocalStorageに保存し、次回訪問時に復元する
5. When システムテーマが選択されている場合, the Web App shall OSのテーマ設定に従う
6. The Theme Switcher shall 一般画面と管理画面の両方のヘッダーに配置される
7. The Theme Switcher shall daisyUIのdata-theme属性を使用してテーマを適用する

### Requirement 4: 一般画面ヘッダーの改善

**Objective:** As a ユーザー, I want モダンなヘッダーを使用したい, so that ナビゲーションとテーマ切り替えが快適にできる

#### Acceptance Criteria
1. The Header shall daisyUIのnavbarコンポーネントを使用してスタイリングされる
2. The Header shall ナビゲーションリンク、テーマ切り替え、ユーザーメニューを含む
3. The Header shall モバイル画面でハンバーガーメニューを表示する
4. When モバイルでハンバーガーメニューをタップした際, the Header shall ナビゲーションドロワーを表示する
5. The Header shall 現在のテーマに応じた適切なスタイルを適用する

### Requirement 5: 管理画面レイアウトの刷新

**Objective:** As a 管理者, I want モダンな管理画面を使用したい, so that 効率的に管理作業ができる

#### Acceptance Criteria
1. The Admin Layout shall サイドバーナビゲーションを提供する
2. The Admin Sidebar shall ダッシュボード、プラットフォーム、別名義種別、クレジット役割、公式作品カテゴリへのリンクを含む
3. The Admin Sidebar shall 各リンクにアイコンを表示する
4. The Admin Sidebar shall 現在のページをアクティブ状態で表示する
5. The Admin Layout shall ヘッダーにロゴ、テーマ切り替え、ユーザー情報、ログアウトボタンを配置する
6. The Admin Layout shall daisyUIのdrawerコンポーネントを使用してレイアウトを構築する

### Requirement 6: 管理画面モバイル対応

**Objective:** As a 管理者, I want モバイルデバイスで管理画面を使用したい, so that 外出先でも管理作業ができる

#### Acceptance Criteria
1. When モバイル画面幅（768px未満）の場合, the Admin Layout shall サイドバーを非表示にする
2. The Admin Layout shall モバイル画面でハンバーガーメニューボタンを表示する
3. When ハンバーガーメニューをタップした際, the Admin Layout shall サイドバーをドロワーとして表示する
4. When ドロワー外をタップした際, the Admin Layout shall ドロワーを閉じる
5. The Admin Layout shall デスクトップ画面（768px以上）でサイドバーを常時表示する

### Requirement 7: Buttonコンポーネントの移行

**Objective:** As a ユーザー, I want daisyUIベースのボタンを使用したい, so that 一貫したデザインシステムで操作できる

#### Acceptance Criteria
1. The Button Component shall daisyUIのbtnクラスを使用してスタイリングされる
2. The Button Component shall variant（primary, secondary, accent, ghost, link, outline）をサポートする
3. The Button Component shall size（xs, sm, md, lg）をサポートする
4. When ボタンがdisabled状態の場合, the Button Component shall 視覚的に無効状態を表示する
5. The Button Component shall 既存のButtonコンポーネントと同じpropsインターフェースを維持する

### Requirement 8: Cardコンポーネントの移行

**Objective:** As a ユーザー, I want daisyUIベースのカードを使用したい, so that コンテンツをグループ化して表示できる

#### Acceptance Criteria
1. The Card Component shall daisyUIのcardクラスを使用してスタイリングされる
2. The Card Component shall Card, CardHeader, CardTitle, CardContent, CardFooterサブコンポーネントを提供する
3. The Card Component shall 既存のCardコンポーネントと同じ構造を維持する

### Requirement 9: Dialogコンポーネントの移行

**Objective:** As a ユーザー, I want daisyUIベースのダイアログを使用したい, so that モーダルコンテンツを表示できる

#### Acceptance Criteria
1. The Dialog Component shall daisyUIのmodalクラスを使用してスタイリングされる
2. The Dialog Component shall Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooterサブコンポーネントを提供する
3. When ダイアログを開く操作をした際, the Dialog Component shall モーダルを表示する
4. When ダイアログを閉じる操作をした際, the Dialog Component shall モーダルを非表示にする
5. The Dialog Component shall 既存のDialogコンポーネントと同じpropsインターフェースを維持する

### Requirement 10: Dropdown Menuコンポーネントの移行

**Objective:** As a ユーザー, I want daisyUIベースのドロップダウンメニューを使用したい, so that コンテキストメニューやアクションを選択できる

#### Acceptance Criteria
1. The Dropdown Menu Component shall daisyUIのdropdownクラスを使用してスタイリングされる
2. The Dropdown Menu Component shall DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabelサブコンポーネントを提供する
3. When トリガーをクリックした際, the Dropdown Menu Component shall メニューを表示する
4. When メニュー外をクリックした際, the Dropdown Menu Component shall メニューを閉じる
5. The Dropdown Menu Component shall 既存のDropdownMenuコンポーネントと同じpropsインターフェースを維持する

### Requirement 11: Inputコンポーネントの移行

**Objective:** As a ユーザー, I want daisyUIベースの入力フィールドを使用したい, so that テキストを入力できる

#### Acceptance Criteria
1. The Input Component shall daisyUIのinputクラスを使用してスタイリングされる
2. The Input Component shall 標準のHTML input属性（type, placeholder, disabled等）をサポートする
3. When 入力フィールドにフォーカスした際, the Input Component shall フォーカススタイルを表示する
4. The Input Component shall 既存のInputコンポーネントと同じpropsインターフェースを維持する

### Requirement 12: Labelコンポーネントの移行

**Objective:** As a ユーザー, I want daisyUIベースのラベルを使用したい, so that フォーム要素を識別できる

#### Acceptance Criteria
1. The Label Component shall daisyUIのlabelクラスまたは適切なスタイリングを使用する
2. The Label Component shall htmlFor属性でフォーム要素と関連付けられる
3. The Label Component shall 既存のLabelコンポーネントと同じpropsインターフェースを維持する

### Requirement 13: Tableコンポーネントの移行

**Objective:** As a ユーザー, I want daisyUIベースのテーブルを使用したい, so that データを表形式で表示できる

#### Acceptance Criteria
1. The Table Component shall daisyUIのtableクラスを使用してスタイリングされる
2. The Table Component shall Table, TableHeader, TableBody, TableRow, TableHead, TableCellサブコンポーネントを提供する
3. The Table Component shall zebraスタイル（交互の行色）オプションをサポートする
4. The Table Component shall 既存のTableコンポーネントと同じ構造を維持する

### Requirement 14: Badgeコンポーネントの移行

**Objective:** As a ユーザー, I want daisyUIベースのバッジを使用したい, so that ステータスやカテゴリを視覚的に表示できる

#### Acceptance Criteria
1. The Badge Component shall daisyUIのbadgeクラスを使用してスタイリングされる
2. The Badge Component shall variant（primary, secondary, accent, ghost, outline）をサポートする
3. The Badge Component shall 既存のBadgeコンポーネントと同じpropsインターフェースを維持する

### Requirement 15: Checkboxコンポーネントの移行

**Objective:** As a ユーザー, I want daisyUIベースのチェックボックスを使用したい, so that 選択状態を切り替えられる

#### Acceptance Criteria
1. The Checkbox Component shall daisyUIのcheckboxクラスを使用してスタイリングされる
2. When チェックボックスをクリックした際, the Checkbox Component shall checked状態をトグルする
3. The Checkbox Component shall 既存のCheckboxコンポーネントと同じpropsインターフェースを維持する

### Requirement 16: Skeletonコンポーネントの移行

**Objective:** As a ユーザー, I want daisyUIベースのスケルトンを使用したい, so that ローディング状態を視覚的に表示できる

#### Acceptance Criteria
1. The Skeleton Component shall daisyUIのskeletonクラスを使用してスタイリングされる
2. The Skeleton Component shall アニメーション効果を持つ
3. The Skeleton Component shall 既存のSkeletonコンポーネントと同じpropsインターフェースを維持する

### Requirement 17: Sonner（Toast）コンポーネントの維持

**Objective:** As a ユーザー, I want トースト通知を引き続き使用したい, so that フィードバックメッセージを受け取れる

#### Acceptance Criteria
1. The Sonner Component shall sonnerパッケージを引き続き使用する（daisyUI移行対象外）
2. The Sonner Component shall daisyUIテーマと視覚的に調和する
3. When テーマが切り替わった際, the Sonner Component shall 現在のテーマに応じたスタイルを適用する
4. The Sonner Component shall 既存の機能を維持する

### Requirement 18: ユーティリティ関数の更新

**Objective:** As a 開発者, I want cn関数を更新またはdaisyUI向けに調整したい, so that クラス名の結合が適切に行われる

#### Acceptance Criteria
1. If clsxのみで十分な場合, the Web App shall tailwind-merge依存を削除しclsxのみを使用する
2. The cn Function shall daisyUIクラスを適切に結合できる
3. When cnユーティリティを使用する際, the Web App shall 既存のコンポーネントで動作する

### Requirement 19: 既存ページの動作確認

**Objective:** As a ユーザー, I want 既存のページが正常に動作し続けることを確認したい, so that 移行による機能退行がない

#### Acceptance Criteria
1. When 管理画面のマスタデータページ（alias-types, credit-roles, official-work-categories, platforms）にアクセスした際, the Web App shall 正常にレンダリングする
2. When インポート・作成ダイアログを使用した際, the Web App shall 正常に動作する
3. When ユーザーメニューを使用した際, the Web App shall 正常に動作する
4. When テーマを切り替えた際, the Web App shall 全画面でテーマが正しく適用される
5. The Web App shall 型チェック（bun run check-types）をエラーなく通過する
6. The Web App shall Lint/フォーマットチェック（bun run check）をエラーなく通過する

### Requirement 20: next-themesの廃止

**Objective:** As a 開発者, I want next-themes依存を削除したい, so that daisyUIネイティブのテーマ機能を使用できる

#### Acceptance Criteria
1. The Web App shall next-themesパッケージを含まない
2. The Web App shall daisyUIのdata-theme属性を使用してテーマを管理する
3. The Theme Management shall カスタムフックまたはコンテキストで実装される
4. When テーマを切り替えた際, the Web App shall document要素のdata-theme属性を更新する


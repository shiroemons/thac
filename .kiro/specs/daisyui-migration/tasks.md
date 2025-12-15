# Implementation Plan

## Task 1: インフラストラクチャセットアップ

- [x] 1. インフラストラクチャセットアップ
- [x] 1.1 daisyUIパッケージの導入
  - daisyUIをdevDependencyとしてインストール
  - TailwindCSS v4のCSS-first設定方式を使用（`@plugin "daisyui"`）
  - デフォルトテーマ（light, dark）を有効化し、system連動を設定
  - ビルドが正常に完了することを確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.2 テーマ管理システムの実装
  - ThemeProviderコンテキストを作成し、テーマ状態（system/light/dark）を管理
  - useThemeフックでテーマの取得と設定機能を提供
  - localStorageへの永続化と復元機能を実装
  - システムテーマ（prefers-color-scheme）の監視機能を実装
  - SSRハイドレーションミスマッチ対策のインラインスクリプトを追加
  - document.documentElementのdata-theme属性を制御
  - _Requirements: 3.3, 3.4, 3.5, 3.7, 20.2, 20.3, 20.4_

- [x] 1.3 cn関数のシンプル化
  - tailwind-merge依存を削除し、clsxのみを使用するよう変更
  - 既存のコンポーネントでcn関数が正常に動作することを確認
  - _Requirements: 18.1, 18.2, 18.3_

## Task 2: UIコンポーネント移行（基本）

- [x] 2. UIコンポーネント移行（基本）
- [x] 2.1 (P) Buttonコンポーネントの移行
  - daisyUIのbtnクラスを使用してスタイリング
  - variant（primary, secondary, accent, ghost, link, outline, destructive）をdaisyUIクラスにマッピング
  - size（xs, sm, md, lg）をdaisyUIクラスにマッピング
  - disabled状態の視覚的表現を確認
  - 既存のpropsインターフェースを維持（asChild対応含む）
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2.2 (P) Inputコンポーネントの移行
  - daisyUIのinputクラスを使用してスタイリング
  - 標準HTML input属性（type, placeholder, disabled等）をサポート
  - フォーカススタイルの適用を確認
  - 既存のpropsインターフェースを維持
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 2.3 (P) Labelコンポーネントの移行
  - daisyUIの適切なスタイリングを適用
  - htmlFor属性でフォーム要素との関連付けを維持
  - 既存のpropsインターフェースを維持
  - _Requirements: 12.1, 12.2, 12.3_

- [x] 2.4 (P) Checkboxコンポーネントの移行
  - daisyUIのcheckboxクラスを使用してスタイリング
  - クリック時のchecked状態トグル動作を確認
  - 既存のpropsインターフェースを維持
  - _Requirements: 15.1, 15.2, 15.3_

- [x] 2.5 (P) Badgeコンポーネントの移行
  - daisyUIのbadgeクラスを使用してスタイリング
  - variant（primary, secondary, accent, ghost, outline）をdaisyUIクラスにマッピング
  - 既存のpropsインターフェースを維持
  - _Requirements: 14.1, 14.2, 14.3_

- [x] 2.6 (P) Skeletonコンポーネントの移行
  - daisyUIのskeletonクラスを使用してスタイリング
  - アニメーション効果が適用されることを確認
  - 既存のpropsインターフェースを維持
  - _Requirements: 16.1, 16.2, 16.3_

## Task 3: UIコンポーネント移行（複合）

- [x] 3. UIコンポーネント移行（複合）
- [x] 3.1 (P) Cardコンポーネントの移行
  - daisyUIのcardクラスを使用してスタイリング
  - Card, CardHeader, CardTitle, CardContent, CardFooterサブコンポーネントを提供
  - 既存の構造を維持
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 3.2 (P) Tableコンポーネントの移行
  - daisyUIのtableクラスを使用してスタイリング
  - Table, TableHeader, TableBody, TableRow, TableHead, TableCellサブコンポーネントを提供
  - zebraスタイル（交互の行色）オプションをサポート
  - 既存の構造を維持
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 3.3 Dialogコンポーネントの移行
  - daisyUIのmodalクラスとネイティブ`<dialog>`要素を使用
  - Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooterサブコンポーネントを提供
  - showModal()/close()メソッドによる開閉制御を実装
  - Escキー、背景クリックでの閉じる動作を実装
  - フォーカストラップが正しく機能することを確認
  - 既存のpropsインターフェースを維持
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 3.4 Dropdown Menuコンポーネントの移行
  - daisyUIのdropdownクラスを使用してスタイリング
  - DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabelサブコンポーネントを提供
  - トリガークリックでメニュー表示、メニュー外クリックで閉じる動作を実装
  - 既存のpropsインターフェースを維持
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

## Task 4: テーマ切り替えUI実装

- [x] 4. テーマ切り替えUI実装
- [x] 4.1 ThemeSwitcherコンポーネントの作成
  - システムテーマ・ライトテーマ・ダークテーマの3つの選択肢を提供
  - 各テーマにアイコン表示（Monitor/Sun/Moon）
  - useThemeフックと連携してテーマを切り替え
  - daisyUIのdropdownコンポーネントを使用
  - _Requirements: 3.1, 3.2, 3.6_

- [x] 4.2 Sonnerコンポーネントのテーマ連動
  - sonnerパッケージを継続使用
  - useThemeフックからresolvedThemeを取得
  - Toasterコンポーネントのtheme propに設定
  - テーマ切り替え時にスタイルが正しく更新されることを確認
  - _Requirements: 17.1, 17.2, 17.3, 17.4_

## Task 5: 一般画面ヘッダーの改善

- [x] 5. 一般画面ヘッダーの改善
  - daisyUIのnavbarコンポーネントを使用してリデザイン
  - ナビゲーションリンク、テーマ切り替え、ユーザーメニューを配置
  - モバイル画面でハンバーガーメニューを表示
  - ハンバーガーメニュータップでナビゲーションドロワーを表示
  - 現在のテーマに応じた適切なスタイルを適用
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

## Task 6: 管理画面レイアウトの刷新

- [x] 6. 管理画面レイアウトの刷新
- [x] 6.1 AdminLayoutコンポーネントの作成
  - daisyUIのdrawerコンポーネントを使用してレイアウトを構築
  - drawer-toggle checkboxでモバイル時の開閉制御を実装
  - lg:drawer-openでデスクトップ常時表示を設定
  - _Requirements: 5.1, 5.6, 6.5_

- [x] 6.2 AdminSidebarコンポーネントの作成
  - menuコンポーネントでナビゲーションリンクを構成
  - ダッシュボード、プラットフォーム、別名義種別、クレジット役割、公式作品カテゴリへのリンクを配置
  - 各リンクにアイコン（lucide-react）を表示
  - 現在のページをアクティブ状態（menu-active）でハイライト
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 6.3 AdminNavbarコンポーネントの作成
  - ロゴ/タイトル表示
  - テーマ切り替えボタン（ThemeSwitcher）を配置
  - ユーザー情報とログアウトボタンを配置
  - _Requirements: 5.5_

- [x] 6.4 管理画面モバイル対応
  - モバイル画面幅（768px未満）でサイドバーを非表示
  - ハンバーガーメニューボタンを表示
  - ハンバーガーメニュータップでサイドバーをドロワーとして表示
  - ドロワー外タップでドロワーを閉じる
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

## Task 7: 管理画面ルート統合

- [x] 7. 管理画面ルート統合
  - 既存のAdminHeaderを削除し、AdminLayoutを使用するよう変更
  - _admin.tsxルートでAdminLayoutを適用
  - 全管理画面ページがAdminLayout内でレンダリングされることを確認
  - サイドバーナビゲーションが正しく動作することを確認
  - _Requirements: 5.1, 5.6_

## Task 8: shadcn/ui依存関係の削除

- [x] 8. shadcn/ui依存関係の削除
- [x] 8.1 Radix UI依存の削除
  - @radix-ui/react-dialogパッケージを削除
  - @radix-ui/react-dropdown-menuパッケージを削除
  - @radix-ui/react-checkboxパッケージを削除
  - @radix-ui/react-labelパッケージを削除
  - @radix-ui/react-slotパッケージを削除
  - コンポーネントからRadix UIのimportを削除
  - _Requirements: 2.1, 2.4_

- [x] 8.2 その他依存の削除
  - class-variance-authorityパッケージを削除
  - tailwind-mergeパッケージを削除
  - next-themesパッケージを削除
  - components.json（shadcn/ui設定ファイル）を削除
  - _Requirements: 2.2, 2.3, 2.6, 20.1_

## Task 9: 統合テストと動作確認

- [x] 9. 統合テストと動作確認
- [x] 9.1 管理画面の動作確認
  - プラットフォーム管理ページが正常にレンダリングされることを確認
  - 別名義種別管理ページが正常にレンダリングされることを確認
  - クレジット役割管理ページが正常にレンダリングされることを確認
  - 公式作品カテゴリ管理ページが正常にレンダリングされることを確認
  - 各ページのインポート・作成ダイアログが正常に動作することを確認
  - _Requirements: 19.1, 19.2_

- [x] 9.2 テーマ切り替えの動作確認
  - 一般画面でテーマ切り替えが正常に動作することを確認
  - 管理画面でテーマ切り替えが正常に動作することを確認
  - テーマ選択がlocalStorageに保存され、リロード後も維持されることを確認
  - システムテーマ選択時にOSのテーマ設定に従うことを確認
  - 全画面でテーマが正しく適用されることを確認
  - _Requirements: 19.4_

- [x] 9.3 ユーザーメニューの動作確認
  - ドロップダウンメニューが正常に開閉することを確認
  - ログアウト機能が正常に動作することを確認
  - _Requirements: 19.3_

- [x] 9.4 ビルドと品質チェック
  - 型チェック（bun run check-types）をエラーなく通過することを確認
  - Lint/フォーマットチェック（bun run check）をエラーなく通過することを確認
  - 本番ビルド（bun run build）がエラーなく完了することを確認
  - _Requirements: 2.5, 19.5, 19.6_

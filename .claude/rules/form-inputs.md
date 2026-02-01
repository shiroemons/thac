---
paths: apps/web/**/*.tsx
---

# フォーム入力のガイドライン

## パスワードマネージャー対策

管理画面等のテキスト入力フィールドでは、1Password等のパスワードマネージャーの自動入力を防止するため、以下の属性を必ず追加すること。

### 対策属性

```tsx
// ❌ NG: パスワードマネージャーが反応する
<Input
  id="tag-name"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

// ✅ OK: パスワードマネージャーを無効化
<Input
  id="tag-name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  autoComplete="off"
  data-1p-ignore
  data-lpignore="true"
  data-form-type="other"
/>
```

### 属性一覧

| 属性 | 対象 | 説明 |
|------|------|------|
| `autoComplete="off"` | 全ブラウザ | ブラウザの自動補完を無効化 |
| `data-1p-ignore` | 1Password | 1Passwordの自動入力を無効化 |
| `data-lpignore="true"` | LastPass | LastPassの自動入力を無効化 |
| `data-form-type="other"` | 各種 | パスワードフィールドとして認識されないようにする |

### 適用対象

- 管理画面の新規作成・編集ダイアログ（全対応済み）
- 検索フォーム（SearchInput, TextSearchFilter）
- UIコンポーネント（tag-input, create-dialog）

### 注意

ログインフォームやパスワード入力欄には適用しないこと。

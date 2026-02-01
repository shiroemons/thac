---
paths: apps/web/**/*.tsx
---

# フォーム入力のガイドライン

## パスワードマネージャー対策（TODO: 別ブランチで全体対応予定）

管理画面等のテキスト入力フィールドで、1Password等のパスワードマネージャーが自動入力を提案する問題がある。

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

### 対象箇所（要調査）

- 管理画面の新規作成・編集ダイアログ
- 検索フォーム
- その他テキスト入力フィールド

### 注意

ログインフォームやパスワード入力欄には適用しないこと。

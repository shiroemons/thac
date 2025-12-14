# Gap Analysis: fix-admin-session-persistence

## 1. 現状調査

### 関連ファイルと構造

| ファイル | 役割 |
|---------|------|
| `packages/auth/src/index.ts` | Better-Auth設定（サーバーサイド） |
| `apps/web/src/lib/auth-client.ts` | Better-Authクライアント設定 |
| `apps/web/src/routes/admin/_admin.tsx` | 管理画面レイアウトルート（認証ガード） |
| `apps/web/src/routes/dashboard.tsx` | ダッシュボードルート（正常動作の参照） |
| `apps/web/src/middleware/auth.ts` | 認証ミドルウェア（サーバー関数用） |
| `apps/web/src/functions/get-user.ts` | ユーザー取得サーバー関数 |
| `apps/server/src/index.ts` | Honoサーバー（CORS・認証ハンドラ） |

### 現在のパターン

**ダッシュボード（正常動作）:**
```typescript
// dashboard.tsx - サーバー関数経由でセッション取得
beforeLoad: async () => {
  const session = await getUser();  // サーバー関数
  return { session };
}
```

**管理画面（問題あり）:**
```typescript
// _admin.tsx - クライアントから直接API呼び出し
beforeLoad: async () => {
  const session = await authClient.getSession();  // クライアントAPI
  if (!session.data?.user) {
    throw redirect({ to: "/admin/login" });
  }
}
```

### 認証ミドルウェア（正常パターン）

```typescript
// middleware/auth.ts
const session = await authClient.getSession({
  fetchOptions: {
    headers: request.headers,  // ★リクエストヘッダー（Cookie含む）を転送
    throw: true,
  },
});
```

## 2. 根本原因

### 問題の特定

`apps/web/src/routes/admin/_admin.tsx`の`beforeLoad`で`authClient.getSession()`を**リクエストヘッダーなしで**呼び出している。

TanStack Start（SSR）環境では、`beforeLoad`はサーバーサイドで実行される。この際：
- ブラウザのCookieは自動的に送信されない
- `request.headers`を明示的に渡す必要がある

### 正常動作との比較

| 項目 | dashboard.tsx（正常） | _admin.tsx（問題） |
|------|----------------------|-------------------|
| セッション取得方法 | `getUser()` サーバー関数 | `authClient.getSession()` 直接呼び出し |
| ヘッダー転送 | `authMiddleware`経由で転送 | なし |
| Cookie受信 | ✅ 可能 | ❌ 不可 |

## 3. 技術要件の分析

### 要件からの技術ニーズ

| 要件 | 技術ニーズ | 現状 |
|------|-----------|------|
| Req 1: セッション永続化 | SSRでのCookie転送 | **Missing** |
| Req 2: Cookie設定 | `sameSite`, `secure`設定 | ✅ 設定済み |
| Req 3: 認証状態確認 | サーバーサイドセッション検証 | **Missing**（ヘッダー転送なし） |
| Req 4: CORS設定 | `credentials: true` | ✅ 設定済み |

### ギャップサマリー

- **Missing**: `beforeLoad`でのリクエストヘッダー転送
- **Constraint**: TanStack Routerの`beforeLoad`は`request`オブジェクトに直接アクセスできない
- **Research Needed**: `beforeLoad`でリクエストヘッダーを取得する方法（TanStack Start固有）

## 4. 実装アプローチの選択肢

### Option A: サーバー関数パターンに統一

**概要**: ダッシュボードと同じパターンを適用

**変更内容**:
1. 管理者用サーバー関数 `getAdminUser()` を作成
2. `_admin.tsx`の`beforeLoad`で`getAdminUser()`を使用
3. 既存の`authMiddleware`を再利用

**変更ファイル**:
- `apps/web/src/functions/get-admin-user.ts`（新規）
- `apps/web/src/routes/admin/_admin.tsx`（修正）

**トレードオフ**:
- ✅ 既存パターンとの一貫性
- ✅ `authMiddleware`の再利用
- ✅ 実装がシンプル
- ❌ 新規ファイル追加

### Option B: ルートミドルウェア方式

**概要**: TanStack Startの`server.middleware`を使用

**変更内容**:
1. `_admin.tsx`に`server.middleware`を追加
2. ミドルウェア内でセッション検証

**変更ファイル**:
- `apps/web/src/routes/admin/_admin.tsx`（修正）

**トレードオフ**:
- ✅ ファイル数増加なし
- ✅ ルートレベルでの認証制御
- ❌ TanStack Start固有の実装
- ❌ `beforeLoad`との統合が複雑

### Option C: tanstackStartCookiesプラグイン追加

**概要**: Better-Authの公式プラグインを使用

**変更内容**:
1. `packages/auth/src/index.ts`に`tanstackStartCookies()`プラグイン追加
2. SSR環境でのCookie自動処理を有効化

**変更ファイル**:
- `packages/auth/src/index.ts`（修正）
- 場合により`_admin.tsx`の修正も必要

**トレードオフ**:
- ✅ 公式サポートされた方法
- ✅ 他のSSRルートにも恩恵
- ❌ プラグインの動作理解が必要
- ❌ 設定変更の影響範囲が広い

## 5. 複雑性とリスク評価

### 工数見積もり

**Option A**: **S（1-2日）**
- 理由: 既存パターンの適用、変更範囲が限定的

**Option B**: **S（1-2日）**
- 理由: 単一ファイル修正、TanStack Start APIの理解が必要

**Option C**: **M（2-3日）**
- 理由: プラグイン動作の検証、既存動作への影響確認が必要

### リスク評価

**Option A**: **Low**
- 理由: 既存の動作確認済みパターン、影響範囲限定的

**Option B**: **Medium**
- 理由: `beforeLoad`との統合パターンの検証が必要

**Option C**: **Medium**
- 理由: プラグイン追加による既存動作への影響を要検証

## 6. 推奨事項

### 推奨アプローチ: Option A（サーバー関数パターンに統一）

**理由**:
1. `dashboard.tsx`で動作実績のあるパターン
2. 最小限のコード変更で実現可能
3. リスクが最も低い
4. プロジェクトの既存パターンとの一貫性

### 設計フェーズでの検討事項

1. **管理者権限検証**: サーバー関数内でロール検証を行うか、`beforeLoad`で行うか
2. **エラーハンドリング**: セッション取得失敗時の挙動
3. **ミドルウェア拡張**: 管理者専用ミドルウェアの必要性

### Research Needed

- [ ] TanStack Start `server.middleware`と`beforeLoad`の実行順序
- [ ] `tanstackStartCookies`プラグインの詳細動作（将来的な採用検討用）


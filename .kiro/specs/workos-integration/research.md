# WorkOS導入調査レポート

## 調査概要

本ドキュメントは、WorkOSをthacプロジェクトに導入する可能性についての調査結果をまとめたものです。

---

## 1. 現在の認証システム分析

### 1.1 Better-Auth構成

現在のプロジェクトは **Better-Auth** を使用した認証システムを実装しています。

**主要コンポーネント:**
- `packages/auth/src/index.ts` - Better-Auth設定
- `packages/db/src/schema/auth.ts` - 認証関連テーブルスキーマ
- `apps/server/src/middleware/admin-auth.ts` - 管理者認証ミドルウェア

**現在の認証機能:**
| 機能 | 実装状況 |
|------|---------|
| メール＆パスワード認証 | ✅ 実装済み |
| ロールベースアクセス制御 | ✅ admin/user |
| セッション管理 | ✅ Cookie-based |
| ソーシャルログイン | ❌ 未実装 |
| SSO (SAML/OIDC) | ❌ 未実装 |
| ディレクトリ同期 | ❌ 未実装 |

**現在の設定:**
```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],
});
```

---

## 2. WorkOS概要

### 2.1 WorkOSとは

WorkOSは、B2B SaaSアプリケーション向けのエンタープライズ認証・ID管理サービスです。主にエンタープライズ顧客への販売を容易にするためのSSOやユーザープロビジョニング機能を提供します。

**主要サービス:**
1. **AuthKit** - ホスト型ログインUI（メール、パスワード、OAuth、Magic Link対応）
2. **Enterprise SSO** - SAML/OIDC対応のシングルサインオン
3. **Directory Sync** - SCIM/HRISからのユーザープロビジョニング
4. **Admin Portal** - 顧客IT管理者向けセルフサービス設定画面
5. **Audit Logs** - エンタープライズ向け監査ログ

### 2.2 技術スタック

- **Node.js SDK**: `@workos-inc/node` (Node 16以上対応)
- **TypeScript**: 完全対応
- **フレームワーク別SDK**:
  - `@workos-inc/authkit-js` - Vanilla JS
  - `@workos-inc/authkit-react` - React
  - `@workos-inc/authkit-remix` - Remix
  - `@workos-inc/authkit-sveltekit` - SvelteKit

**基本的な使用方法:**
```typescript
import { WorkOS } from '@workos-inc/node';

const workos = new WorkOS(process.env.WORKOS_API_KEY);

// SSO認証URLの生成
const authorizationUrl = workos.sso.getAuthorizationUrl({
  clientId: process.env.WORKOS_CLIENT_ID,
  redirectUri: 'https://your-app.com/callback',
  connection: 'connection_id',
});
```

---

## 3. 料金体系

### 3.1 AuthKit (ユーザー管理)

| プラン | 価格 |
|-------|------|
| 無料枠 | 100万MAU/月まで無料 |
| 超過分 | $2,500/月（100万MAUごと） |

※MAU = 月間アクティブユーザー（サインイン/サインアップを行ったユーザー）

### 3.2 Enterprise SSO

| 接続数 | 月額/接続 |
|--------|----------|
| 1-15 | $125 |
| 16-30 | $100 |
| 31-50 | $80 |
| 51-100 | $65 |

※1接続 = 1つのエンタープライズ顧客のIdP接続

### 3.3 Audit Logs

- SIEM接続: $125/月/接続
- イベント保持: $99/月/100万イベント

### 3.4 コスト試算（thacプロジェクト向け）

| シナリオ | 想定コスト |
|---------|-----------|
| AuthKitのみ（100万MAU以下） | 無料 |
| + SSO 1接続 | $125/月 |
| + SSO 5接続 | $625/月 |
| + SSO 10接続 | $1,250/月 |

---

## 4. 統合オプションの比較

### 4.1 オプションA: WorkOS直接統合

**概要:** Better-Authを置き換えてWorkOSをプライマリ認証として使用

**メリット:**
- エンタープライズSSO対応が即座に可能
- ホスト型UIで開発工数削減
- ディレクトリ同期機能が利用可能
- 運用・保守の負担軽減

**デメリット:**
- 既存認証システムの完全書き換えが必要
- 外部サービス依存によるベンダーロックイン
- SSO接続ごとの課金でコスト増加の可能性
- 日本語サポートの不確実性

**工数見積:** 高（2-3週間程度）

### 4.2 オプションB: Better-Auth SSO プラグイン活用

**概要:** Better-Authの既存SSOプラグインを使用してSAML/OIDC対応

**メリット:**
- 現在のシステムからの移行が最小限
- オープンソースで柔軟にカスタマイズ可能
- 外部サービス依存なし
- 追加コストなし

**デメリット:**
- SAMLサポートはまだ開発中
- ディレクトリ同期は手動実装が必要
- 運用・保守は自社対応

**工数見積:** 中（1-2週間程度）

**SSOプラグイン設定例:**
```typescript
import { sso } from "@better-auth/sso";

export const auth = betterAuth({
  // 既存設定...
  plugins: [
    admin({ ... }),
    sso({
      // OIDC/SAMLプロバイダー設定
    }),
  ],
});
```

### 4.3 オプションC: ハイブリッド構成

**概要:** 基本認証はBetter-Auth維持、エンタープライズSSOのみWorkOS使用

**メリット:**
- 既存システムへの影響が最小限
- 必要に応じてエンタープライズ機能を追加
- 段階的な導入が可能

**デメリット:**
- 2つの認証システムの統合・保守が必要
- ユーザー管理の複雑化
- 実装の複雑さ

**工数見積:** 中-高（2-3週間程度）

---

## 5. 推奨アプローチ

### 5.1 現時点での推奨: オプションB（Better-Auth SSOプラグイン）

**理由:**
1. **コスト効率**: 追加コストなしでSSO対応が可能
2. **技術的一貫性**: 現在のBetter-Auth基盤を活用
3. **柔軟性**: 必要に応じてWorkOSへの移行が後からでも可能
4. **リスク低減**: 既存システムへの影響が最小限

### 5.2 WorkOS導入を検討すべきタイミング

以下の条件が満たされた場合、WorkOS導入を再検討することを推奨:

1. **エンタープライズ顧客の増加**: SSO接続が5件以上必要になった場合
2. **ディレクトリ同期の要件**: SCIM対応が必須となった場合
3. **運用負荷の増大**: 認証システムの保守が課題となった場合
4. **監査要件**: 詳細な監査ログが必要となった場合

---

## 6. 次のステップ

### 短期（1-2週間）
1. Better-Auth SSOプラグインの評価
2. OIDC対応の技術検証（Proof of Concept）
3. テスト環境でのSSO動作確認

### 中期（必要に応じて）
1. WorkOS評価アカウント取得
2. AuthKitのPoCを実施
3. コスト・メリットの再評価

### 長期
1. エンタープライズ要件に基づく最終決定
2. 選択したソリューションの本番導入

---

## 参考リンク

- [WorkOS公式サイト](https://workos.com)
- [WorkOS Pricing](https://workos.com/pricing)
- [WorkOS SSO](https://workos.com/single-sign-on)
- [WorkOS Node.js SDK](https://github.com/workos/workos-node)
- [Better-Auth SSO Plugin](https://www.better-auth.com/docs/plugins/sso)
- [WorkOS Review 2025](https://www.infisign.ai/reviews/workos)

---

## 調査実施日

2025年12月28日

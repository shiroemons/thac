# Better-Auth 全機能調査レポート

Issue #245に基づくBetter-Auth拡張検討のための包括的調査結果

## 調査サマリー

| カテゴリ | プラグイン数 | 状態 |
|---------|------------|------|
| 認証拡張 | 10+ | 安定 |
| 権限・組織管理 | 3 | 安定 |
| セッション・トークン | 5 | 安定 |
| OAuth/SSO | 4 | 安定/開発中 |
| セキュリティ | 3 | 安定 |
| 決済統合 | 5 | 安定 |
| その他 | 5+ | 安定 |
| エンタープライズ | 18 | 開発中 |

---

## 1. 認証拡張プラグイン

| プラグイン | 機能概要 | DB変更 | 主要設定 |
|-----------|---------|--------|---------|
| **twoFactor** | TOTP/OTP + バックアップコード + 信頼デバイス | `twoFactor`テーブル, `user.twoFactorEnabled` | `issuer`, `otpOptions`, `backupCodeOptions` |
| **passkey** | WebAuthn/FIDO2パスキー認証 | `passkey`テーブル | `authenticatorAttachment` |
| **magicLink** | パスワードレス認証（メールリンク） | `magicLinkCode`テーブル | `sendMagicLink`, `expiresIn` |
| **emailOTP** | メールOTP認証 | `emailVerificationOTP`テーブル | `sendVerificationOTP`, `otpLength` |
| **phoneNumber** | 電話番号OTP認証 | `phoneNumberVerification`テーブル | `sendOTP`, `otpLength`, `expiresIn` |
| **anonymous** | 匿名ユーザー認証 | TBD | - |
| **oneTap** | Google One Tap認証 | なし | Google設定 |
| **username** | ユーザー名ベース認証 | `user.username` | - |
| **deviceAuthorization** | IoT/CLI向けRFC 8628準拠 | `deviceCode`テーブル | `verificationURI`, `interval` |
| **siwe** | Sign in with Ethereum（Web3） | `account`テーブル | ENSルックアップ対応 |

### 2FA Plugin 詳細

```typescript
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    twoFactor({
      issuer: "thac",
      otpOptions: {
        period: 30,     // TOTP有効期間（秒）
        digits: 6,      // OTP桁数
      },
      backupCodeOptions: {
        count: 10,      // バックアップコード数
        length: 8,      // 各コードの長さ
      },
    }),
  ],
});
```

---

## 2. 権限・組織管理プラグイン

| プラグイン | 機能概要 | DB変更 | 主要設定 |
|-----------|---------|--------|---------|
| **organization** | 組織/メンバー/チーム/ロール管理 | `organization`, `member`, `invitation`, `organizationRole`, `team` | `allowUserToCreateOrganization`, `ac`, `roles`, `dynamicAccessControl` |
| **admin** | 管理者機能（ユーザー管理、BAN、なりすまし） | `user.role`, `user.banned`, `session.impersonatedBy` | `defaultRole`, `adminRoles`, `impersonationSessionDuration` |
| **access** | アクセス制御ユーティリティ | なし | `createAccessControl()`, `ac.newRole()` |

### アクセス制御の実装パターン

```typescript
import { createAccessControl } from "better-auth/plugins/access";

// 権限定義
const ac = createAccessControl({
  user: ["read", "update"],
  post: ["create", "read", "update", "delete"],
  admin: ["manage"],
});

// カスタムロール定義
const ownerRole = ac.newRole({
  user: ["read", "update"],
  post: ["create", "read", "update", "delete"],
  admin: ["manage"],
});

const editorRole = ac.newRole({
  post: ["create", "read", "update"],
});

const viewerRole = ac.newRole({
  post: ["read"],
});
```

### Organization Plugin 詳細

```typescript
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      ac: ac,  // アクセス制御インスタンス
      roles: {
        owner: ownerRole,
        admin: adminRole,
        member: memberRole,
      },
      dynamicAccessControl: true,  // 動的ロール管理
    }),
  ],
});
```

---

## 3. セッション・トークン管理プラグイン

| プラグイン | 機能概要 | DB変更 | 主要設定 |
|-----------|---------|--------|---------|
| **bearer** | Bearerトークン認証（Cookie代替） | なし | `requireSignature` |
| **jwt** | JWTトークン生成 + JWKSエンドポイント | `jwks`テーブル | `keyPairConfig.alg` |
| **multiSession** | 複数セッション同時管理 | `session.deviceId` | `maximumSessions` (default: 5) |
| **oneTimeToken** | ワンタイムトークン（クロスドメイン認証） | `oneTimeToken`テーブル | `expiresIn`, `storeToken` |
| **apiKey** | APIキー生成・管理・レート制限 | `apiKey`テーブル | `rateLimit.enabled`, `rateLimit.maxRequests` |

### API Key Plugin 詳細

```typescript
import { apiKey } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    apiKey({
      rateLimit: {
        enabled: true,
        maxRequests: 100,
        window: 60,  // 60秒
      },
      // ストレージモード: database | redis | redis-fallback
      storageMode: "database",
    }),
  ],
});
```

---

## 4. OAuth/SSOプラグイン

### 4.1 標準ソーシャルプロバイダ

| プロバイダ | 設定キー | スコープ例 |
|-----------|---------|-----------|
| Google | `google` | `email profile openid` |
| GitHub | `github` | `user:email read:user` |
| Discord | `discord` | `identify email` |
| Apple | `apple` | `email name` |
| Microsoft | `microsoft` | `User.Read` |
| Facebook | `facebook` | `email public_profile` |
| Twitter/X | `twitter` | `tweet.read users.read` |
| LinkedIn | `linkedin` | `r_liteprofile r_emailaddress` |
| Spotify | `spotify` | `user-read-email` |
| Twitch | `twitch` | `user:read:email` |
| TikTok | `tiktok` | `user.info.basic` |
| GitLab | `gitlab` | `read_user` |
| Dropbox | `dropbox` | `account_info.read` |

### 4.2 Generic OAuthプリセット

| プロバイダ | 関数 | 必須パラメータ |
|-----------|------|---------------|
| Auth0 | `auth0()` | `domain` |
| Okta | `okta()` | `issuer` |
| Keycloak | `keycloak()` | `issuer` |
| Microsoft Entra ID | `microsoftEntraId()` | `tenantId` |
| LINE | `line()` | - |
| Slack | `slack()` | - |
| HubSpot | `hubspot()` | - |

### 4.3 SSO/エンタープライズ

| プラグイン | 機能 | 状態 |
|-----------|------|------|
| **oidcProvider** | Better-AuthをOIDCプロバイダ化 | 安定 |
| **sso** | 複数IdP統合（OIDC/SAML） | 安定 |
| **saml** | SAML 2.0 SSO（Okta, Azure AD, OneLogin） | 開発中 |
| **scim** | Microsoft Entra IDプロビジョニング | 安定 |

### OAuth設定例

```typescript
export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: ["email", "profile", "openid"],
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: ["user:email", "read:user"],
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      scope: ["identify", "email"],
    },
  },
});
```

---

## 5. セキュリティプラグイン

| プラグイン | 機能概要 | 対応サービス |
|-----------|---------|-------------|
| **captcha** | ボット対策 | Cloudflare Turnstile, Google reCAPTCHA, hCaptcha, CaptchaFox |
| **haveIBeenPwned** | 流出パスワードチェック | Have I Been Pwned API |
| **backupCodes** | 2FA回復用コード | 最大10個、1回限り使用 |

### セキュリティ機能（コア）

| 機能 | 説明 |
|------|------|
| **CSRF保護** | Origin検証、SameSite Cookie |
| **レート制限** | IP検出ベース、エンドポイント別設定 |
| **パスワードハッシュ** | Scrypt（メモリ困難型） |
| **セッション鮮度チェック** | `freshAge`設定 |
| **Cookie Chunking** | 大サイズCookie分割（v1.4+） |

### CAPTCHA Plugin 詳細

```typescript
import { captcha } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: process.env.TURNSTILE_SECRET_KEY!,
      endpoints: ["signIn", "signUp"],  // 適用エンドポイント
    }),
  ],
});
```

---

## 6. 決済統合プラグイン

| プラグイン | 機能概要 | 特徴 |
|-----------|---------|------|
| **stripe** | 決済・サブスクリプション管理 | Webhook処理対応 |
| **polar** | 決済プラットフォーム | 25+ Webhookハンドラ |
| **creem** | ソフトウェア販売 | レベニュースプリット |
| **autumnBilling** | 料金プラン管理 | AI製品向け |
| **dodoPayments** | リアルタイム決済 | イベント処理 |

---

## 7. フレームワーク統合プラグイン

| プラグイン | フレームワーク | 用途 |
|-----------|--------------|------|
| **nextCookies** | Next.js | Cookie自動設定 |
| **tanstackStartCookies** | TanStack Start | Cookie自動設定 |
| **expo** | React Native/Expo | モバイル対応 |
| **openAPI** | 全般 | OpenAPI仕様生成 |

### TanStack Start 統合例

```typescript
// apps/web/app/routes/api.auth.$.ts
import { tanstackStartCookies } from "better-auth/plugins";
import { auth } from "@thac/auth";

export const Route = createAPIFileRoute("/api/auth/$")({
  GET: ({ request }) => {
    return auth.handler(request, {
      plugins: [tanstackStartCookies()],
    });
  },
  POST: ({ request }) => {
    return auth.handler(request, {
      plugins: [tanstackStartCookies()],
    });
  },
});
```

---

## 8. コミュニティプラグイン（推奨）

| プラグイン | 機能 | リポジトリ |
|-----------|------|-----------|
| better-auth-harmony | メール/電話正規化、55,000+一時メールドメイン検証 | GitHub |
| better-auth-cloudflare | Cloudflare Workers/D1/KV/R2統合 | GitHub |
| expo-better-auth-passkey | Expoパスキー認証 | GitHub |
| better-auth-opaque | OPAQUEプロトコル（ゼロ知識認証） | GitHub |
| better-auth-credentials-plugin | LDAP認証 | GitHub |
| better-auth-firebase-auth | Firebase Authentication統合 | GitHub |

---

## 9. 実験的・ベータ機能

| 機能 | 説明 | バージョン | 設定 |
|------|------|----------|------|
| **Joins** | クエリ性能2-3倍向上 | v1.4+（v1.5で標準化予定） | `experimental.joins: true` |
| **Stateless Auth** | DB不要セッション（JWE Cookie） | v1.4 | `session.type: "stateless"` |
| **Cookie Chunking** | 大サイズCookie分割 | v1.4 | `advanced.cookieChunking: true` |

### Joins 有効化

```typescript
export const auth = betterAuth({
  experimental: {
    joins: true,  // 2-3x パフォーマンス向上
  },
});
```

---

## 10. エンタープライズプラグイン（開発中）

kriasoft/better-authリポジトリで18プラグイン開発中：

| カテゴリ | プラグイン |
|---------|-----------|
| セキュリティ | Abuse Detection, Fraud Detection, Audit Log |
| 通知・連携 | Notifications, Webhooks, MCP |
| ユーザー管理 | Impersonation, Onboarding, Connect |
| データ | Analytics, Storage, Backup Codes |
| コンプライアンス | Compliance, Consent |
| 機能管理 | Feature Flags, Rate Limit |
| 課金 | Subscription |
| セッション | Session Management |

---

## 11. コアAPI一覧

### サーバー側API

```typescript
// セッション管理
auth.api.getSession({ headers })
auth.api.listSessions({ headers })
auth.api.revokeSession({ body: { id: sessionId }, headers })
auth.api.revokeOtherSessions({ headers })
auth.api.revokeSessions({ body: { userId }, headers })

// 認証
auth.api.signInEmail({ body: { email, password } })
auth.api.signUpEmail({ body: { email, password, name } })
auth.api.resetPassword({ body: { email } })
auth.api.changePassword({ body: { oldPassword, newPassword }, headers })
auth.api.verifyEmail({ query: { token } })

// ユーザー管理
auth.api.listUsers({ query: { limit, offset } })
auth.api.getUser({ query: { userId } })
auth.api.updateUser({ body: { name, ... }, headers })
auth.api.deleteUser({ headers })
```

### クライアント側API

```typescript
// 認証
authClient.signIn.email({ email, password })
authClient.signIn.social({ provider: "google" })
authClient.signUp.email({ email, password, name })
authClient.signOut()

// セッション
authClient.getSession()
authClient.useSession()  // リアクティブ（React Hook）
authClient.listSessions()
authClient.revokeSession(sessionId)
authClient.revokeOtherSessions()

// OAuth
authClient.signIn.oauth2({ providerId: "..." })
authClient.linkSocial({ provider: "..." })
authClient.getAccessToken({ providerId: "..." })
authClient.unlinkAccount({ providerId: "..." })
```

---

## 12. データベースアダプター

### 公式アダプター

| アダプター | DB | Join対応 |
|-----------|-----|---------|
| Drizzle ORM | PostgreSQL/MySQL/SQLite | ✅ v1.4+ |
| Prisma | PostgreSQL/MySQL/SQLite | ✅ v1.4+ |
| Kysely（組み込み） | PostgreSQL/MySQL/SQLite/MSSQL | ✅ |
| MongoDB | MongoDB | ✅ v1.4+ |

### Kysely方言（20+）

- PlanetScale, Cloudflare D1, Neon, Xata, libSQL
- AWS RDS Data API, Supabase, SurrealDB, PGLite等

### Drizzle Adapter 設定

```typescript
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@thac/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",  // または "pg", "mysql"
    // スキーマカスタマイズ
    usePlural: true,     // users, sessions テーブル名
  }),
});
```

---

## 13. ID生成戦略

| モード | 設定値 | 説明 |
|--------|-------|------|
| UUID | `"uuid"` | ランダムUUID生成（デフォルト） |
| Serial | `"serial"` | DB自動インクリメント |
| DB委任 | `false` | DBカラムデフォルト使用 |
| カスタム | `function` | 任意のID生成ロジック |

```typescript
export const auth = betterAuth({
  advanced: {
    database: {
      generateId: "uuid",  // または "serial", false, カスタム関数
    },
  },
});

// カスタムID生成
export const auth = betterAuth({
  advanced: {
    database: {
      generateId: ({ model }) => {
        if (model === "user") return undefined;  // DB委任
        return crypto.randomUUID();
      },
    },
  },
});
```

---

## 14. スキーマカスタマイズ

### テーブル名変更

```typescript
export const auth = betterAuth({
  user: {
    modelName: "users",  // user → users
  },
  session: {
    modelName: "sessions",
  },
});
```

### フィールドマッピング

```typescript
export const auth = betterAuth({
  user: {
    fields: {
      name: "full_name",      // user.name → full_name カラム
      email: "email_address", // user.email → email_address カラム
    },
  },
});
```

### 追加フィールド

```typescript
export const auth = betterAuth({
  user: {
    additionalFields: {
      phoneNumber: {
        type: "string",
        required: false,
      },
      companyId: {
        type: "string",
        required: false,
        references: {
          model: "company",
          field: "id",
        },
      },
    },
  },
});
```

---

## 15. Issue #245 要件との適合性

| 要件 | Better-Auth対応 | プラグイン/設定 |
|------|----------------|----------------|
| Google OAuth | ✅ | `socialProviders.google` |
| GitHub OAuth | ✅ | `socialProviders.github` |
| Discord OAuth | ✅ | `socialProviders.discord` |
| カスタムロール | ✅ | `organization` + `access` |
| 2FA/TOTP | ✅ | `twoFactor` |
| メール認証（管理者のみ） | ✅ 実装済み | `emailAndPassword` |
| コスト | ✅ 完全無料 | セルフホスト |

---

## 16. 推奨実装構成

```typescript
// packages/auth/src/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin,
  organization,
  twoFactor,
  bearer
} from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { db } from "@thac/db";

// アクセス制御定義
const ac = createAccessControl({
  track: ["read", "create", "update", "delete"],
  user: ["read", "update"],
  admin: ["manage"],
});

// ロール定義
const adminRole = ac.newRole({
  track: ["read", "create", "update", "delete"],
  user: ["read", "update"],
  admin: ["manage"],
});

const editorRole = ac.newRole({
  track: ["read", "create", "update"],
  user: ["read"],
});

const viewerRole = ac.newRole({
  track: ["read"],
});

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),

  // 既存設定維持
  emailAndPassword: { enabled: true },

  // OAuth追加
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    },
  },

  plugins: [
    admin(),           // 既存
    organization({     // カスタムロール
      ac,
      roles: {
        admin: adminRole,
        editor: editorRole,
        viewer: viewerRole,
      },
    }),
    twoFactor({        // 2FA
      issuer: "thac",
    }),
    bearer(),          // API認証用
  ],

  // 性能最適化
  experimental: {
    joins: true,
  },
});
```

---

## 17. DBスキーマ変更（マイグレーション必要）

### 追加テーブル

| プラグイン | テーブル | 主要カラム |
|-----------|---------|-----------|
| twoFactor | `twoFactor` | `id`, `userId`, `secret`, `backupCodes` |
| organization | `organization` | `id`, `name`, `slug`, `logo`, `metadata` |
| organization | `member` | `id`, `organizationId`, `userId`, `role` |
| organization | `invitation` | `id`, `organizationId`, `email`, `role`, `status` |
| organization | `organizationRole` | `id`, `organizationId`, `name`, `permissions` |
| organization | `team` | `id`, `organizationId`, `name` |

### 追加フィールド

| テーブル | カラム | 型 |
|---------|-------|-----|
| user | `twoFactorEnabled` | boolean |
| account | `providerId` | string（OAuth用） |
| account | `accessToken` | string（OAuth用） |
| account | `refreshToken` | string（OAuth用） |

### マイグレーション実行

```bash
# スキーマ生成
npx @better-auth/cli generate --config ./packages/auth/src/auth.ts

# Drizzle マイグレーション
make db-generate
make db-migrate
```

---

## 18. 実装タスク一覧

### Phase 1: OAuth設定

- [ ] Google OAuth プロバイダー設定
- [ ] GitHub OAuth プロバイダー設定
- [ ] Discord OAuth プロバイダー設定
- [ ] 環境変数追加（CLIENT_ID, CLIENT_SECRET）
- [ ] DBマイグレーション（accountテーブル拡張）
- [ ] ソーシャルログインボタンUI

### Phase 2: 2FA実装

- [ ] twoFactor plugin 追加
- [ ] DBスキーマ更新（twoFactorテーブル）
- [ ] 2FA 有効化/無効化 UI
- [ ] QRコード表示・TOTP検証UI
- [ ] バックアップコード管理UI

### Phase 3: カスタムロール実装

- [ ] organization plugin 追加
- [ ] access control 定義
- [ ] ロール定義（admin/editor/viewer等）
- [ ] DBスキーマ更新（organization関連テーブル）
- [ ] 権限チェックミドルウェア
- [ ] ロール管理画面UI

---

## 19. 参考リンク

### 公式ドキュメント

- [Better-Auth 公式](https://www.better-auth.com/)
- [プラグイン一覧](https://www.better-auth.com/docs/concepts/plugins)
- [OAuth設定](https://www.better-auth.com/docs/concepts/oauth)
- [2FA Plugin](https://www.better-auth.com/docs/plugins/2fa)
- [Organization Plugin](https://www.better-auth.com/docs/plugins/organization)
- [Admin Plugin](https://www.better-auth.com/docs/plugins/admin)
- [Access Control](https://www.better-auth.com/docs/plugins/access)
- [CLI ドキュメント](https://www.better-auth.com/docs/reference/cli)

### ソーシャルプロバイダ設定

- [Google Provider](https://www.better-auth.com/docs/authentication/google)
- [GitHub Provider](https://www.better-auth.com/docs/authentication/github)
- [Discord Provider](https://www.better-auth.com/docs/authentication/discord)

### バージョン情報

- 安定版: v1.4.17（2025年1月21日）
- ベータ版: v1.5.0-beta.9（2025年1月21日）

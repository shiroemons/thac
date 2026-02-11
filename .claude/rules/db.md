---
paths: packages/db/**
---

# データベース（Drizzle ORM）

## 概要

Drizzle ORMを使用したPostgreSQLデータベースパッケージ。

## ディレクトリ構成

```
packages/db/
├── src/
│   ├── index.ts          # dbクライアント（Proxy遅延初期化）
│   ├── schema/            # テーブル定義
│   └── utils/
│       ├── ssl.ts         # SSL自動検出
│       ├── script-client.ts # スクリプト用クライアント
│       └── id.ts          # ID生成
├── drizzle.config.ts
└── package.json
```

## コマンド

```bash
make db-push       # スキーマをDBにプッシュ
make db-generate   # マイグレーションを生成
make db-migrate    # マイグレーションを実行
make db-seed       # シードデータを投入
make db-setup      # DBセットアップ（push + seed）
make db-studio     # Drizzle Studioを起動
```

## 開発ガイドライン

- スキーマは`src/schema/`配下に配置
- 新しいテーブルを追加したら`src/schema/index.ts`でエクスポート
- スキーマ変更後は`make db-generate`でマイグレーション生成
- `@thac/db`として他パッケージからインポート可能

## DB設計原則

- SQLアンチパターンを避ける（参考: 書籍「SQLアンチパターン」）
- 正規化を適切に行う
- 外部キー制約を活用する

## 接続管理

### Proxy遅延初期化パターン

`db`はProxyで遅延初期化される。ブラウザ側のモジュールロード時にDB接続を作らない。

```typescript
// NG: モジュールトップレベルで直接初期化
const db = drizzle(postgres(url));

// OK: Proxyで初回アクセス時に初期化
export const db = new Proxy({} as DrizzleDB, {
  get(_, prop) { return getDb()[prop as keyof DrizzleDB]; },
});
```

### プール設定

| 設定 | サーバー用 | スクリプト用 |
|------|-----------|------------|
| `max` | `DB_POOL_MAX` or 10 | 3 |
| `idle_timeout` | 20s | 10s |
| `connect_timeout` | 10s | 10s |
| `statement_timeout` | 30s | 300s（5分） |
| `application_name` | `thac-server` | `thac-script` |

- スクリプト用（seed/migration）は低プール・長タイムアウト → `createScriptClient()`
- `max_lifetime: 60 * 30`（30分）で長時間接続を防止

### SSL自動検出

`DATABASE_SSL`環境変数で明示制御。未設定時はURL自動検出。

| 値 | 動作 |
|----|------|
| `disable` / `false` | SSL無効 |
| `require` | SSL必須（証明書検証なし） |
| `verify-full` | SSL必須 + CA検証 + ホスト名一致 |
| 未設定 | localhost → false、リモート → `require` |

### グレースフルシャットダウン

`cleanup()`はpre-nullificationパターンを使用。複数回呼び出し安全。

```typescript
// 参照をnullにしてから end() → 並行アクセスの競合を防止
const client = _sql;
_sql = null;
_db = null;
await client.end({ timeout: 5 });
```

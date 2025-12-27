# Project Structure

## Organization Philosophy

Turborepoによるモノレポ構成で、アプリケーション（apps/）と共有パッケージ（packages/）を明確に分離。依存関係は一方向（apps → packages）に保ち、循環参照を防ぐ。

## Directory Patterns

### Applications (`apps/`)
**Location**: `/apps/{app-name}/`
**Purpose**: デプロイ可能な独立したアプリケーション
**Example**: `apps/web/`（フロントエンド）、`apps/server/`（API）

### Shared Packages (`packages/`)
**Location**: `/packages/{package-name}/`
**Purpose**: アプリ間で共有するロジックとスキーマ
**Example**: `@thac/db`、`@thac/auth`、`@thac/config`

### Frontend Routes (`apps/web/src/routes/`)
**Location**: `/apps/web/src/routes/`
**Purpose**: TanStack Routerのファイルベースルーティング
**Example**: `routes/index.tsx`、`routes/about.tsx`

### UI Components (`apps/web/src/components/`)
**Location**: `/apps/web/src/components/`
**Purpose**: Reactコンポーネント
**Example**: `components/ui/`（daisyUIベースのカスタムコンポーネント）、カスタムコンポーネント

### Admin Components (`apps/web/src/components/admin/`)
**Location**: `/apps/web/src/components/admin/`
**Purpose**: 管理画面用コンポーネント
**Pattern**: `{entity}-edit-dialog.tsx`（編集ダイアログ）、`data-table-*.tsx`（テーブル関連）
**Example**: `artist-edit-dialog.tsx`, `track-edit-dialog.tsx`, `data-table-pagination.tsx`

### Database Schema (`packages/db/src/schema/`)
**Location**: `/packages/db/src/schema/`
**Purpose**: Drizzle ORMスキーマ定義
**Pattern**: `{entity}.ts`（スキーマ）+ `{entity}.validation.ts`（Zodバリデーション）
**Example**: `auth.ts`, `track.ts`, `release.ts`, `artist-circle.ts`

### Custom Hooks (`apps/web/src/hooks/`)
**Location**: `/apps/web/src/hooks/`
**Purpose**: 再利用可能なReactカスタムフック
**Naming**: `use-{name}.ts`（kebab-case）
**Example**: `use-debounce.ts`, `use-column-visibility.ts`

### Client Middleware (`apps/web/src/middleware/`)
**Location**: `/apps/web/src/middleware/`
**Purpose**: TanStack Startのルートミドルウェア
**Example**: `auth.ts`（認証ガード）

### Server Functions (`apps/web/src/functions/`)
**Location**: `/apps/web/src/functions/`
**Purpose**: TanStack Startのサーバーサイド関数
**Example**: `get-user.ts`, `get-admin-user.ts`

### Server Middleware (`apps/server/src/middleware/`)
**Location**: `/apps/server/src/middleware/`
**Purpose**: Honoミドルウェア
**Example**: `admin-auth.ts`（管理者認証ガード）

### API Routes (`apps/server/src/routes/`)
**Location**: `/apps/server/src/routes/`
**Purpose**: Honoルート定義
**Pattern**: 機能別にディレクトリを分割、`index.ts`でルートをエクスポート
**Example**: `routes/admin/`（管理API）

### Utility Package (`packages/utils/`)
**Location**: `/packages/utils/`
**Purpose**: アプリ間で共有するユーティリティ関数
**Example**: `initial-detector.ts`

## Naming Conventions

- **Files (Components)**: PascalCase（例: `Button.tsx`）
- **Files (Utils/Config)**: kebab-case（例: `auth-client.ts`）
- **Directories**: kebab-case（例: `components/ui/`）
- **Functions**: camelCase（例: `createAuthClient`）
- **Types/Interfaces**: PascalCase（例: `UserSession`）

## Import Organization

```typescript
// 1. External libraries
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

// 2. Workspace packages
import { auth } from "@thac/auth";
import { db } from "@thac/db";

// 3. Relative imports
import { Button } from "./components/ui/button";
```

**Path Aliases**:
- `@/`: `apps/web/src/`へのエイリアス（Webアプリ内）

## Package Dependencies

```
apps/web → @thac/auth
apps/server → @thac/auth, @thac/db
packages/auth → @thac/db
packages/utils → @thac/config
packages/config → (standalone)
```

## Code Organization Principles

- **共有ロジックはpackages/へ**: 複数アプリで使うコードはパッケージ化
- **循環依存禁止**: packages間の依存は一方向のみ（auth → db）
- **Colocate関連ファイル**: コンポーネントと関連ファイルは近くに配置
- **自動生成ファイルは編集禁止**: `routeTree.gen.ts`などは手動編集しない

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_

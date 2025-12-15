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

### Database Schema (`packages/db/src/schema/`)
**Location**: `/packages/db/src/schema/`
**Purpose**: Drizzle ORMスキーマ定義
**Example**: `schema/auth.ts`（認証テーブル）

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
packages/config → (standalone)
```

## Code Organization Principles

- **共有ロジックはpackages/へ**: 複数アプリで使うコードはパッケージ化
- **循環依存禁止**: packages間の依存は一方向のみ（auth → db）
- **Colocate関連ファイル**: コンポーネントと関連ファイルは近くに配置
- **自動生成ファイルは編集禁止**: `routeTree.gen.ts`などは手動編集しない

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_

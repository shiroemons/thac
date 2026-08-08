# thac（東方編曲録）

東方Projectの二次創作音楽（アレンジ曲）を管理・検索できるWebアプリケーション。

## 主な機能

- **原曲から探す** - 公式曲からアレンジ曲を検索
- **サークルから探す** - サークルのリリース・アレンジ曲を一覧
- **アーティストから探す** - ボーカル・編曲者など役割別に検索
- **イベントから探す** - 例大祭やコミケなどイベント別に新譜を追う
- **配信先を見つける** - Spotify、BOOTHなど配信リンクを集約
- **統計情報** - サークル・アーティスト・イベント別の統計

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フロントエンド | React, TanStack Start, TanStack Router, TailwindCSS v4, daisyUI |
| バックエンド | Hono (Node.js) |
| データベース | PostgreSQL, Drizzle ORM |
| 検索 | Meilisearch |
| 認証 | Better-Auth（Email/Password, Google/Discord/GitHub OAuth） |
| ビルド | Turborepo, pnpm |
| コード品質 | Biome, Lefthook |
| タスク実行 | Task（miseでバージョン管理） |
| 開発環境 | mise + Devbox, Docker |

## プロジェクト構成

```
thac/
├── apps/
│   ├── web/            # フロントエンド（React + TanStack Start）
│   └── server/         # バックエンドAPI（Hono）
├── packages/
│   ├── auth/           # 認証設定（Better-Auth）
│   ├── db/             # データベーススキーマ（Drizzle ORM）
│   ├── search/         # 検索エンジン統合（Meilisearch）
│   ├── utils/          # 共通ユーティリティ
│   └── config/         # 共有設定（TypeScript）
├── taskfiles/          # ドメイン別Task定義
├── Taskfile.yml        # タスクのエントリーポイント
├── mise.toml           # 開発ツール設定
├── mise.lock           # Task・Devboxのバージョン・checksum固定
└── data/               # ローカル開発データ（.gitignore）
    └── meilisearch/    # Meilisearchインデックス
```

### パッケージ依存関係

```
apps/web    → @thac/auth
apps/server → @thac/auth, @thac/db, @thac/search, @thac/utils
packages/auth   → @thac/db
packages/search → @thac/db
```

## クイックスタート

### 前提条件

- [mise](https://mise.jdx.dev/)（Task・Devboxのインストールと環境自動読込）

### セットアップ

```bash
# 1. miseをインストール（未インストールの場合）
curl https://mise.run | sh

# 2. ~/.zshrcの末尾へ追加し、シェルを再起動（初回のみ）
echo 'eval "$($HOME/.local/bin/mise activate zsh)"' >> ~/.zshrc
exec zsh

# 3. リポジトリのmise設定を信頼
mise trust

# 4. mise.lockに固定されたTask・Devboxをインストール
mise install

# 5. 依存関係 + DB初期化 + シードデータ投入
task setup

# 6. 全サービスをバックグラウンドで起動
task up
```

Devboxを別途グローバルインストールする必要はありません。miseはプロジェクトへ移動したときにDevbox環境を現在のシェルへ読み込み、Node.js・pnpm・PostgreSQL・Meilisearchを直接使える状態にします。

```text
mise activate
├── Task 3.x           ── task up / task check / task test
├── Devbox 0.17.x
└── devbox shellenv    ── node / pnpm / postgres / meilisearch
```

`task setup`は以下を一括実行します：

1. `pnpm install --frozen-lockfile` — 依存関係のインストール
2. PostgreSQL起動確認（未起動なら起動）
3. データベース作成（`thac`）
4. スキーマ適用 + シードデータ投入（管理者ユーザー、マスターデータ、公式作品データ）

### 起動するサービス

| サービス | URL | 説明 |
|---------|-----|------|
| PostgreSQL | localhost:5432 | データベース |
| Web | http://localhost:3000 | TanStack Start フロントエンド |
| API Server | http://localhost:3001 | Hono API サーバー |
| Meilisearch | http://localhost:7700 | 検索エンジン |

### 管理者アカウント

シードデータにより以下の管理者アカウントが作成されます：

| 項目 | デフォルト値 | 環境変数 |
|------|-------------|---------|
| メール | admin@example.com | `ADMIN_EMAIL` |
| パスワード | admin123456 | `ADMIN_PASSWORD` |
| 名前 | Admin | `ADMIN_NAME` |

## 利用可能なコマンド

miseがTaskとDevboxを同列に管理し、Devboxの環境をシェルへ一度だけ読み込みます。Taskfile内はコマンドを直接実行するため、毎回サブシェルを作るオーバーヘッドがありません。

普段は`task up`などの短いタスクを使います。Taskにない一時的な操作も`pnpm add ...`や`meilisearch --version`のように直接実行でき、`devbox run --`や`mise exec --`は不要です。

`mise`・`task`・`git`は環境を制御する側のコマンドとして直接実行します。Node.js・pnpm・PostgreSQL・MeilisearchなどのDevbox管理対象は、miseが読み込んだDevbox環境から提供されます。

### 開発・品質チェック

| コマンド | 説明 |
|---------|------|
| `task setup` | 依存関係・DBをセットアップ |
| `task` | 利用可能なタスクを表示 |
| `task dev` | Web・API開発サーバーを起動 |
| `task build` / `task b` | アプリケーションをビルド |
| `task install` / `task i` | pnpm依存関係をインストール |
| `task check` / `task lint` | Lint・フォーマットを変更せずに検査 |
| `task check:fix` / `task fix` | Lint・フォーマット違反を自動修正 |
| `task check-types` / `task types` | 型チェック |
| `task test` | テストを実行 |
| `task ci` | CIと同じ全チェックを実行 |

### データベース操作

| コマンド | 説明 |
|---------|------|
| `task db:push` | スキーマをDBにプッシュ |
| `task db:generate` | マイグレーションを生成 |
| `task db:migrate` | マイグレーションを実行 |
| `task db:seed` | シードデータを投入（管理者 + マスター + 公式） |
| `task db:setup` | DBセットアップ（push + seed） |
| `task db:studio` | Drizzle Studioを起動 |
| `task db:truncate` | マスタデータ・公式作品以外をトランケート（確認あり） |

### サービス管理

| コマンド | 説明 |
|---------|------|
| `task up` | 全サービスをバックグラウンドで起動 |
| `task down` | 全サービスを停止 |
| `task status` / `task ps` | サービス状態を表示 |
| `task restart` | 全サービスを再起動 |
| `task services:dev` | 全サービスをフォアグラウンドで起動（TUI） |
| `task services:stop-app` | Web・APIのみ停止 |
| `task worktree:dev` | worktreeのWeb・APIを起動 |

`task --list`で説明付きタスク、`task --list-all`で全公開タスクを確認できます。内部タスクは直接実行できません。

### Task・Devboxのバージョン管理

```bash
# 既存のmise.lockを使って両方をインストール
mise install

# 設定した範囲内で更新し、対応プラットフォームのlockを更新
mise upgrade aqua:go-task/task aqua:jetify-com/devbox
mise lock --platform linux-x64,macos-arm64 aqua:go-task/task aqua:jetify-com/devbox
```

miseは既存の`mise.lock`を通常の`mise install`でも利用します。CIではロックファイルとの不整合をエラーにするlocked modeを有効にし、CIに必要なTaskだけをインストールします。`mise.toml`と`mise.lock`は必ず同時にコミットしてください。環境の自動切替もmiseが担うため、direnvは不要です。

## Git Hooks

このプロジェクトはlefthookを使用してpre-commitフックを設定しています。
`pnpm install` 時に自動でhooksがインストールされます。

コミット前に以下が自動実行されます：

- **check-types**: 型チェック（`turbo check-types`）
- **biome**: Lintとフォーマット（`biome check --write`）

エラーがある場合、コミットがブロックされます。

## CI/CD

### GitHub Actions

| ワークフロー | トリガー | 説明 |
|-------------|---------|------|
| CI | Push/PR to main | Lint、型チェック、テストを実行 |

> **Note**: Markdown、docs/、LICENSEへの変更はCIをスキップします。

CIでは`task ci`から以下のチェックが順番に実行されます：

- `pnpm check` - Lint・フォーマット
- `pnpm check-types` - 型チェック
- `pnpm --dir apps/web lint:jsx-nesting` - JSXネスト検証
- `pnpm test` - テスト

---

## Docker を使用する場合（代替）

<details>
<summary>Docker Compose による開発環境</summary>

### 前提条件

- Docker / Docker Compose

### 開発環境の起動

```bash
# 開発環境を起動（Docker Compose）
task docker:dev

# バックグラウンドで起動する場合
task docker:up
```

- Web: http://localhost:3000
- API: http://localhost:3001

### 初回セットアップ

```bash
# 開発環境を起動後、DBセットアップ（スキーマ適用 + シードデータ投入）
task docker:db:setup
```

### Docker コマンド一覧

#### 開発環境管理

| コマンド | 説明 |
|---------|------|
| `task docker:dev` | 開発環境を起動（フォアグラウンド） |
| `task docker:up` | 開発環境を起動（バックグラウンド） |
| `task docker:down` | 開発環境を停止 |
| `task docker:logs` | ログを表示（フォロー） |
| `task docker:logs:server` | Serverのログを表示 |
| `task docker:logs:web` | Webのログを表示 |
| `task docker:status` | コンテナの状態を表示 |
| `task docker:restart` | コンテナを再起動 |

#### メンテナンス

| コマンド | 説明 |
|---------|------|
| `task docker:rebuild` | イメージを再ビルドして起動 |
| `task docker:clean` | コンテナ・ボリューム・イメージを削除（確認あり） |
| `task docker:shell:server` | Serverコンテナにシェル接続 |
| `task docker:shell:web` | Webコンテナにシェル接続 |

#### テスト

| コマンド | 説明 |
|---------|------|
| `task test` | miseが読み込んだ開発環境でテストを実行 |

#### 依存関係の更新後（Docker使用時）

```bash
# 1. 最新のコードを取得
git pull

# 2. ローカルの依存関係を更新
task install

# 3. Dockerコンテナの依存関係を更新（ボリューム共有のため通常は不要）
docker compose exec web pnpm install
docker compose exec server pnpm install
```

> **Note**: Docker環境はホストの`node_modules`をボリュームマウントしているため、
> ローカルで`pnpm install --frozen-lockfile`を実行すればコンテナにも反映されます。

</details>

## アクセシビリティ

本プロジェクトはGitHub Primerのアクセシビリティガイドラインに準拠しています。

### 通知・フィードバック

- **トースト通知は使用しません**（WCAG準拠のため）
- 成功通知: UIの変化で成功を示す（ダイアログ閉じる、リスト更新等）
- エラー通知: Bannerコンポーネントまたはインライン表示

詳細は `.claude/steering/admin.md` を参照。

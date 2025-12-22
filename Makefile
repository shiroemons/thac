.PHONY: help dev up down logs ps build clean rebuild reset reset-deps prune shell-server shell-web \
	db-push db-generate db-migrate db-seed db-setup db-studio \
	check check-types check-local check-types-local test test-local

# デフォルトターゲット
help: ## ヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# =============================================================================
# 開発環境（Docker Compose）
# =============================================================================

dev: ## 開発環境を起動（docker compose up）
	docker compose up

up: ## 開発環境をバックグラウンドで起動
	docker compose up -d

down: ## 開発環境を停止
	docker compose down

logs: ## ログを表示（フォロー）
	docker compose logs -f

logs-server: ## Serverのログを表示
	docker compose logs -f server

logs-web: ## Webのログを表示
	docker compose logs -f web

ps: ## コンテナの状態を表示
	docker compose ps

restart: ## コンテナを再起動
	docker compose restart

# =============================================================================
# 本番ビルド
# =============================================================================

build: ## 本番用イメージをビルド
	docker build -t thac .

run: ## 本番用コンテナを実行（要: 環境変数設定）
	docker run -p 3000:3000 -p 3001:3001 \
		-e DATABASE_URL=$${DATABASE_URL} \
		-e BETTER_AUTH_SECRET=$${BETTER_AUTH_SECRET} \
		-e BETTER_AUTH_URL=$${BETTER_AUTH_URL:-http://localhost:3000} \
		-e CORS_ORIGIN=$${CORS_ORIGIN:-http://localhost:3001} \
		thac

# =============================================================================
# メンテナンス
# =============================================================================

clean: ## コンテナ・ボリューム・イメージを削除
	docker compose down -v --rmi local

rebuild: ## イメージを再ビルドして起動
	docker compose down
	docker compose build --no-cache
	docker compose up -d

reset: ## 完全リセット（ボリューム削除→再ビルド→起動）
	docker compose down -v --remove-orphans
	docker compose build --no-cache
	docker compose up -d

reset-deps: ## コンテナ内のnode_modulesを再インストール
	docker compose exec server rm -rf node_modules
	docker compose exec web rm -rf node_modules
	docker compose exec server bun install
	docker compose exec web bun install

prune: ## Docker不要リソースを削除（キャッシュ・未使用イメージ等）
	docker system prune -f
	docker builder prune -f

shell-server: ## Serverコンテナにシェル接続
	docker compose exec server sh

shell-web: ## Webコンテナにシェル接続
	docker compose exec web sh

# =============================================================================
# データベース（Docker）
# =============================================================================

db-push: ## スキーマをDBにプッシュ（Docker）
	docker compose exec server bun run --cwd /app db:push

db-generate: ## マイグレーションを生成（Docker）
	docker compose exec server bun run --cwd /app db:generate

db-migrate: ## マイグレーションを実行（Docker）
	docker compose exec server bun run --cwd /app db:migrate

db-seed: ## シードデータを投入（Docker）
	docker compose exec server bun run --cwd /app db:seed

db-setup: ## DBセットアップ（push + seed）（Docker）
	docker compose exec server bun run --cwd /app db:push
	docker compose exec server bun run --cwd /app db:seed

db-studio: ## Drizzle Studioを起動（ローカル）
	bun run db:studio

# =============================================================================
# ユーティリティ
# =============================================================================

install: ## 依存関係をインストール（ローカル）
	bun install

check: ## Lint・フォーマットチェック（Docker）
	docker compose exec server bun run check

check-types: ## 型チェック（Docker）
	docker compose exec server bun run check-types

check-local: ## Lint・フォーマットチェック（ローカル）
	bun run check

check-types-local: ## 型チェック（ローカル）
	bun run check-types

test: ## テストを実行（Docker）
	docker compose exec server bun test

test-local: ## テストを実行（ローカル）
	bun test

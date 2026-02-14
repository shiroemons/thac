.PHONY: help dev up down ps restart \
	docker-dev docker-up docker-down docker-logs docker-logs-server docker-logs-web docker-ps docker-restart \
	build run \
	docker-clean docker-rebuild docker-reset docker-reset-deps docker-prune docker-shell-server docker-shell-web \
	db-push db-generate db-migrate db-seed db-setup db-studio db-truncate \
	docker-db-push docker-db-generate docker-db-migrate docker-db-seed docker-db-setup docker-db-truncate \
	install check check-types test lint-markuplint stop-app wt-dev

# デフォルトターゲット
help: ## ヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# =============================================================================
# 開発環境（devbox）
# =============================================================================

dev: ## 開発環境を起動（devbox services）
	devbox services up

up: ## 開発環境をバックグラウンドで起動
	@if devbox services ls 2>&1 | grep -q "Services running in process-compose"; then \
		echo "サービスは既に起動しています"; \
	else \
		devbox services up -b; \
	fi
	@$(MAKE) --no-print-directory ps

down: ## 開発環境を停止
	@if devbox services ls 2>&1 | grep -q "Services running in process-compose"; then \
		devbox services stop; \
		echo "サービスを停止しました"; \
	else \
		echo "サービスは起動していません"; \
	fi

ps: ## サービスの状態を表示
	@if devbox services ls 2>&1 | grep -q "Services running in process-compose"; then \
		devbox services ls; \
	else \
		echo "サービスは起動していません。make up で起動できます。"; \
	fi

restart: ## サービスを再起動
	@if devbox services ls 2>&1 | grep -q "Services running in process-compose"; then \
		devbox services restart; \
	else \
		echo "サービスは起動していません。make up で起動してください。"; \
	fi

stop-app: ## web+serverのみ停止（DB/Meilisearchは維持）
	@lsof -i :3000 -sTCP:LISTEN -t 2>/dev/null | xargs kill 2>/dev/null || true
	@lsof -i :3001 -sTCP:LISTEN -t 2>/dev/null | xargs kill 2>/dev/null || true
	@echo "✅ web + server を停止しました"

wt-dev: ## worktree内でweb+serverを起動（メインのDB/Meilisearchに接続）
	@pg_isready -h localhost -p 5432 -q 2>/dev/null || { echo "❌ PostgreSQLが起動していません。メインworktreeで make up を実行してください"; exit 1; }
	@curl -sf http://localhost:7700/health >/dev/null 2>&1 || { echo "❌ Meilisearchが起動していません。メインworktreeで make up を実行してください"; exit 1; }
	@if lsof -i :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then \
		echo "❌ ポート3000が使用中です。make stop-app で停止してください"; exit 1; \
	fi
	@if lsof -i :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then \
		echo "❌ ポート3001が使用中です。make stop-app で停止してください"; exit 1; \
	fi
	@echo "🚀 web + server を起動します..."
	@devbox run -- sh -c 'trap "kill 0" EXIT; bun run --cwd apps/server dev & bun run --cwd apps/web dev & wait'

# =============================================================================
# 開発環境（Docker）
# =============================================================================

docker-dev: ## 開発環境を起動（Docker）
	docker compose up

docker-up: ## 開発環境をバックグラウンドで起動（Docker）
	docker compose up -d

docker-down: ## 開発環境を停止（Docker）
	docker compose down

docker-logs: ## ログを表示（Docker）
	docker compose logs -f

docker-logs-server: ## Serverのログを表示（Docker）
	docker compose logs -f server

docker-logs-web: ## Webのログを表示（Docker）
	docker compose logs -f web

docker-ps: ## コンテナの状態を表示（Docker）
	docker compose ps

docker-restart: ## コンテナを再起動（Docker）
	docker compose restart

# =============================================================================
# 本番ビルド
# =============================================================================

build: ## 本番用イメージをビルド
	docker build -t thac .

run: ## 本番用コンテナを実行（要: 環境変数設定）
	docker run -p 3001:3001 -p 3000:3000 \
		-e DATABASE_URL=$${DATABASE_URL} \
		-e BETTER_AUTH_SECRET=$${BETTER_AUTH_SECRET} \
		-e BETTER_AUTH_URL=$${BETTER_AUTH_URL:-http://localhost:3001} \
		-e CORS_ORIGIN=$${CORS_ORIGIN:-http://localhost:3000} \
		thac

# =============================================================================
# メンテナンス（Docker）
# =============================================================================

docker-clean: ## コンテナ・ボリューム・イメージを削除
	docker compose down -v --rmi local

docker-rebuild: ## イメージを再ビルドして起動
	docker compose down
	docker compose build --no-cache
	docker compose up -d

docker-reset: ## 完全リセット（ボリューム削除→再ビルド→起動）
	docker compose down -v --remove-orphans
	docker compose build --no-cache
	docker compose up -d

docker-reset-deps: ## コンテナ内のnode_modulesを再インストール
	docker compose exec server rm -rf node_modules
	docker compose exec web rm -rf node_modules
	docker compose exec server bun install
	docker compose exec web bun install

docker-prune: ## Docker不要リソースを削除
	docker system prune -f
	docker builder prune -f

docker-shell-server: ## Serverコンテナにシェル接続
	docker compose exec server sh

docker-shell-web: ## Webコンテナにシェル接続
	docker compose exec web sh

# =============================================================================
# データベース（devbox/ローカル）
# =============================================================================

db-push: ## スキーマをDBにプッシュ
	bun run db:push

db-generate: ## マイグレーションを生成
	bun run db:generate

db-migrate: ## マイグレーションを実行
	bun run db:migrate

db-seed: ## シードデータを投入
	bun run db:seed

db-setup: ## DBセットアップ（push + seed）
	bun run db:push
	bun run db:seed

db-studio: ## Drizzle Studioを起動
	bun run db:studio

db-truncate: ## マスタデータ・公式作品以外をトランケート
	bun run db:truncate

# =============================================================================
# データベース（Docker）
# =============================================================================

docker-db-push: ## スキーマをDBにプッシュ（Docker）
	docker compose exec server bun run --cwd /app db:push

docker-db-generate: ## マイグレーションを生成（Docker）
	docker compose exec server bun run --cwd /app db:generate

docker-db-migrate: ## マイグレーションを実行（Docker）
	docker compose exec server bun run --cwd /app db:migrate

docker-db-seed: ## シードデータを投入（Docker）
	docker compose exec server bun run --cwd /app db:seed

docker-db-setup: ## DBセットアップ（push + seed）（Docker）
	docker compose exec server bun run --cwd /app db:push
	docker compose exec server bun run --cwd /app db:seed

docker-db-truncate: ## マスタデータ・公式作品以外をトランケート（Docker）
	docker compose exec server bun run --cwd /app db:truncate

# =============================================================================
# ユーティリティ
# =============================================================================

install: ## 依存関係をインストール
	bun install

check: ## Lint・フォーマットチェック
	bun run check

check-types: ## 型チェック
	bun run check-types

test: ## テストを実行
	bun test

lint-markuplint: ## Markuplintを実行
	bun run --cwd apps/web lint:markuplint

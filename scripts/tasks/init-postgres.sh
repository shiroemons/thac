#!/usr/bin/env bash

set -Eeuo pipefail

: "${PGDATA:?PGDATAが設定されていません。miseでプロジェクト環境を有効化してください}"

if [[ -f "$PGDATA/PG_VERSION" ]]; then
	exit 0
fi

mkdir -p "$PGDATA"
initdb --pgdata "$PGDATA" --no-locale --encoding=UTF8

cat >>"$PGDATA/postgresql.conf" <<'EOF'

# thac development settings
listen_addresses = 'localhost'
port = 5432
shared_buffers = 128MB
work_mem = 4MB
effective_cache_size = 512MB
random_page_cost = 1.1
log_min_duration_statement = 1000
EOF

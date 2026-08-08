#!/usr/bin/env bash

set -Eeuo pipefail

: "${PGDATA:?PGDATAが設定されていません。miseでプロジェクト環境を有効化してください}"
: "${PGDATABASE:?PGDATABASEが設定されていません。miseでプロジェクト環境を有効化してください}"

pg_port="${PGPORT:-5432}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! "$PGDATABASE" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
	echo "PGDATABASEに使用できない文字が含まれています: $PGDATABASE" >&2
	exit 1
fi

if [[ ! "$pg_port" =~ ^[0-9]+$ || "$pg_port" -lt 1 || "$pg_port" -gt 65535 ]]; then
	echo "PGPORTが不正です: $pg_port" >&2
	exit 1
fi

if pg_ctl status >/dev/null 2>&1; then
	if ! pg_isready -h localhost -p "$pg_port" -q -t 3; then
		echo "プロジェクトのPostgreSQLは起動中ですが、localhost:$pg_port で応答していません。" >&2
		exit 1
	fi
elif lsof -nP -iTCP:"$pg_port" -sTCP:LISTEN -t >/dev/null 2>&1; then
	echo "localhost:$pg_port は別のプロセスで使用されています。使用中のプロジェクトを停止してください。" >&2
	exit 1
else
	bash "$script_dir/init-postgres.sh"
	pg_ctl start -l "$PGDATA/postgresql.log" -w
fi

database_exists="$(
	psql \
		--dbname postgres \
		--tuples-only \
		--no-align \
		--command "SELECT 1 FROM pg_database WHERE datname = '$PGDATABASE'"
)"

if [[ "$database_exists" != "1" ]]; then
	createdb "$PGDATABASE"
	echo "Database '$PGDATABASE' created"
else
	echo "Database '$PGDATABASE' ready"
fi

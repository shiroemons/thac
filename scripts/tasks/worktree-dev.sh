#!/usr/bin/env bash

set -Eeuo pipefail

if ! pg_isready -h localhost -p 5432 -q; then
	echo "PostgreSQLが起動していません。メインworktreeで task up を実行してください。" >&2
	exit 1
fi

if ! curl --fail --silent --show-error --max-time 3 http://localhost:7700/health >/dev/null; then
	echo "Meilisearchが起動していません。メインworktreeで task up を実行してください。" >&2
	exit 1
fi

for port in 3000 3001; do
	if lsof -i ":$port" -sTCP:LISTEN -t >/dev/null; then
		echo "port $port が使用中です。task services:stop-app で停止してください。" >&2
		exit 1
	fi
done

echo "Web・API開発サーバーを起動します"
pnpm --dir apps/server dev &
server_pid=$!
pnpm --dir apps/web dev &
web_pid=$!

cleanup() {
	local exit_code=$?
	trap - EXIT INT TERM HUP

	for pid in "$server_pid" "$web_pid"; do
		if kill -0 "$pid" 2>/dev/null; then
			kill "$pid"
		fi
	done

	# 子プロセスの終了待ちは、最初に発生した終了コードを上書きしない。
	set +e
	wait "$server_pid" "$web_pid" 2>/dev/null
	exit "$exit_code"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

wait -n "$server_pid" "$web_pid"

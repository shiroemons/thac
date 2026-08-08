#!/usr/bin/env bash

set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

services_running() {
	local output

	output="$(devbox services ls 2>&1)" || return 1
	[[ "$output" == *"Services running in process-compose"* ]]
}

stop_standalone_postgres() {
	if pg_ctl status >/dev/null 2>&1; then
		echo "単体起動中のPostgreSQLをdevboxサービス管理へ切り替えます"
		pg_ctl stop -m fast -w
	fi
}

check_ports_available() {
	local project_postgres_running="${1:-0}"
	local conflict=0
	local port

	for port in 3000 3001 5432 7700; do
		if [[ "$port" == "5432" && "$project_postgres_running" == "1" ]]; then
			continue
		fi
		if lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
			echo "port $port が別のプロセスで使用中のため、サービスを起動できません。" >&2
			conflict=1
		fi
	done

	if [[ "$conflict" -ne 0 ]]; then
		echo "使用中のプロジェクトやプロセスを停止してから task up を再実行してください。" >&2
		return 1
	fi
}

services_ready() {
	services_running &&
		pg_isready -h localhost -p 5432 -q -t 1 &&
		curl --fail --silent --max-time 1 http://localhost:7700/health >/dev/null &&
		curl --fail --silent --max-time 1 http://localhost:3001/ >/dev/null &&
		curl --fail --silent --max-time 1 http://localhost:3000/ >/dev/null
}

wait_for_services() {
	local deadline=$((SECONDS + 45))

	while ((SECONDS < deadline)); do
		if services_ready; then
			return
		fi
		sleep 1
	done

	echo "サービスが45秒以内に起動しませんでした。" >&2
	devbox services ls >&2 || true
	return 1
}

prepare_start() {
	local project_postgres_running=0

	if pg_ctl status >/dev/null 2>&1; then
		project_postgres_running=1
	fi
	check_ports_available "$project_postgres_running"
	if [[ "$project_postgres_running" == "0" ]]; then
		bash "$script_dir/init-postgres.sh"
	fi
	stop_standalone_postgres
}

case "${1:-}" in
	dev)
		if services_running; then
			exec devbox services attach
		fi
		prepare_start
		exec devbox services up
		;;
	up)
		if services_running; then
			echo "サービスは既に起動しています"
			started_services=0
		else
			prepare_start
			devbox services up -b
			started_services=1
		fi
		if ! wait_for_services; then
			if [[ "$started_services" == "1" ]]; then
				devbox services stop >/dev/null 2>&1 || true
			fi
			exit 1
		fi
		devbox services ls
		;;
	down)
		if services_running; then
			devbox services stop
			echo "サービスを停止しました"
		elif pg_ctl status >/dev/null 2>&1; then
			pg_ctl stop -m fast -w
			echo "PostgreSQLを停止しました"
		else
			echo "サービスは起動していません"
		fi
		;;
	status)
		if services_running; then
			devbox services ls
		elif pg_ctl status >/dev/null 2>&1; then
			echo "PostgreSQLのみ起動しています。task up で全サービスを起動できます。"
		else
			echo "サービスは起動していません。task up で起動できます。"
		fi
		;;
	restart)
		if ! services_running; then
			echo "サービスは起動していません。task up で起動してください。" >&2
			exit 1
		fi
		devbox services restart
		wait_for_services
		devbox services ls
		;;
	*)
		echo "usage: $0 {dev|up|down|status|restart}" >&2
		exit 2
		;;
esac

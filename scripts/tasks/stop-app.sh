#!/usr/bin/env bash

set -Eeuo pipefail

stop_port() {
	local port="$1"
	local service="$2"
	local output
	local -a pids

	if ! output="$(lsof -i ":$port" -sTCP:LISTEN -t)"; then
		if [[ -z "$output" ]]; then
			echo "$service は起動していません（port: $port）"
			return
		fi
		echo "$service のプロセス確認に失敗しました（port: $port）" >&2
		exit 1
	fi

	mapfile -t pids <<<"$output"
	for pid in "${pids[@]}"; do
		if [[ ! "$pid" =~ ^[0-9]+$ ]]; then
			echo "不正なプロセスIDを検出しました: $pid" >&2
			exit 1
		fi
	done

	kill "${pids[@]}"
	echo "$service を停止しました（PID: ${pids[*]}）"
}

stop_port 3000 web
stop_port 3001 server

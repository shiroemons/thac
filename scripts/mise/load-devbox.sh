#!/usr/bin/env bash

_thac_load_devbox() {
	if [[ "${CI:-}" == "true" || "${CI:-}" == "1" ]]; then
		return
	fi

	local project_root
	project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
	if [[ "${DEVBOX_SHELL_ENABLED:-}" == "1" && "${DEVBOX_PROJECT_ROOT:-}" == "$project_root" ]]; then
		return
	fi

	# 初回のmise install前はdevboxがまだ存在しないため、そのまま継続する。
	if ! command -v devbox >/dev/null 2>&1; then
		return
	fi

	local shell_env
	shell_env="$(devbox shellenv -q --install --config "$project_root")" || return
	eval "$shell_env"

	local corepack_bin="$DEVBOX_PROJECT_ROOT/.devbox/corepack-bin"
	if [[ ! -x "$corepack_bin/pnpm" && -x "$DEVBOX_PACKAGES_DIR/bin/corepack" ]]; then
		mkdir -p "$corepack_bin"
		"$DEVBOX_PACKAGES_DIR/bin/corepack" enable --install-directory "$corepack_bin" >/dev/null
	fi
}

_thac_load_devbox
unset -f _thac_load_devbox

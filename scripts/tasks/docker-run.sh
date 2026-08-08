#!/usr/bin/env bash

set -Eeuo pipefail

image="${1:?Dockerイメージ名を指定してください}"
: "${DATABASE_URL:?DATABASE_URLを設定してください}"
: "${BETTER_AUTH_SECRET:?BETTER_AUTH_SECRETを設定してください}"

exec docker run \
	-p 3001:3001 \
	-p 3000:3000 \
	-e "DATABASE_URL=$DATABASE_URL" \
	-e "BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET" \
	-e "BETTER_AUTH_URL=${BETTER_AUTH_URL:-http://localhost:3001}" \
	-e "CORS_ORIGIN=${CORS_ORIGIN:-http://localhost:3000}" \
	"$image"

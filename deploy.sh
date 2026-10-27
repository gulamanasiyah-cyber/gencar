#!/usr/bin/env bash
# ==================================================================
#  Pintasan deploy Gencar — memanggil deploy/deploy.sh
# ==================================================================
[ -n "${BASH_VERSION:-}" ] || exec bash "$0" "$@"
SINI="$(cd "$(dirname "$0")" && pwd)"
exec bash "$SINI/deploy/deploy.sh" "$@"

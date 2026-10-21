#!/usr/bin/env bash
# ==================================================================
#  Kembali ke versi sebelumnya — pintasan untuk deploy.sh --kembali
#  Jalankan sebagai pengguna deploy.
# ==================================================================
[ -n "${BASH_VERSION:-}" ] || exec bash "$0" "$@"
set -euo pipefail
exec "$(dirname "$0")/deploy.sh" --kembali

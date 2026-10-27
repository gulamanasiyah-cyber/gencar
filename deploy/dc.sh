#!/usr/bin/env bash
# ==================================================================
#  docker compose untuk Gencar di server, dengan pengaturan
#  yang benar (folder data, pengguna, versi yang sedang aktif).
#  Jalankan sebagai pengguna deploy, dari folder mana pun:
#
#    bash deploy/dc.sh ps                     keadaan wadah
#    bash deploy/dc.sh logs -f --tail 200     catatan aplikasi
#    bash deploy/dc.sh restart                menyalakan ulang
#    bash deploy/dc.sh up -d --force-recreate menerapkan perubahan .env
#    bash deploy/dc.sh exec app sh            masuk ke dalam wadah
# ==================================================================
[ -n "${BASH_VERSION:-}" ] || exec bash "$0" "$@"
set -euo pipefail
. "$(dirname "$0")/umum.sh"
pastikan_bukan_root
[ $# -gt 0 ] || { sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }
dc "$@"

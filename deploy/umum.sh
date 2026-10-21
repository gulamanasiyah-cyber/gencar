# shellcheck shell=bash
# ==================================================================
#  Bagian bersama untuk semua skrip di deploy/ (di-"source", bukan
#  dijalankan sendiri).
#
#  Letak (bisa diganti lewat variabel lingkungan, jarang perlu):
#    GC_APP   /srv/apps/gencar     program (repo git)
#    GC_DATA  /srv/data/gencar     .env, cadangan
# ==================================================================

GC_NAMA="gencar"
GC_APP="${GC_APP:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
GC_DATA="${GC_DATA:-/srv/data/gencar}"
GC_ENV="$GC_DATA/.env"
GC_PORT="${GC_PORT:-3102}"

merah()  { printf '\033[31m%s\033[0m\n' "$*"; }
hijau()  { printf '\033[32m%s\033[0m\n' "$*"; }
kuning() { printf '\033[33m%s\033[0m\n' "$*"; }
langkah() { echo; printf '\033[1m== %s\033[0m\n' "$*"; }
berhenti() { echo; merah "BERHENTI: $*"; echo; exit 1; }

# Nilai satu kunci dari .env (baris terakhir menang; tanda kutip dibuang).
baca_env() {
  [ -r "$GC_ENV" ] || return 0
  sed -n "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*//p" "$GC_ENV" | tail -n 1 \
    | sed -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/" | tr -d '\r'
}

# docker compose dengan pengaturan yang benar.
dc() {
  GC_DATA="$GC_DATA" GC_PORT="$GC_PORT" GC_UID="$(id -u)" GC_GID="$(id -g)" \
  GC_TAG="${GC_TAG:-$(cat "$GC_DATA/.tag-aktif" 2>/dev/null || echo terbaru)}" \
    docker compose --project-directory "$GC_APP" -p "$GC_NAMA" -f "$GC_APP/docker-compose.yml" "$@"
}

pastikan_bukan_root() {
  [ "$(id -u)" != 0 ] || berhenti "jangan dijalankan sebagai root. Masuk sebagai pengguna deploy:  sudo -iu deploy"
  docker info >/dev/null 2>&1 || berhenti "pengguna $(id -un) belum bisa memakai Docker (harus anggota grup docker; jalankan deploy/setup-server.sh sebagai sysadmin)."
}

tunggu_sehat() {
  # tunggu_sehat DETIK  -> 0 kalau /api/health menjawab "ok"
  local batas=$(( $(date +%s) + ${1:-90} )) jawab
  while [ "$(date +%s)" -lt "$batas" ]; do
    jawab="$(curl -fsS --max-time 3 "http://127.0.0.1:$GC_PORT/api/health" 2>/dev/null || true)"
    case "$jawab" in *'"status":"ok"'*) echo "$jawab"; return 0 ;; esac
    sleep 2
  done
  return 1
}

#!/usr/bin/env bash
# ==================================================================
#  GENCAR — ALL-IN-ONE DEPLOY SCRIPT ("Sekali Running Jalan Semua")
#
#  Mendukung 2 User:
#    1. sysadmin (sudoer / pengganti root):
#       - Menyiapkan izin folder, cek Nginx & .env
#       - Otomatis mengalihkan eksekusi container ke user 'deploy'
#    2. deploy (tanpa sudo, grup docker):
#       - Git pull (ff-only)
#       - Membangun image Docker (commit tag)
#       - Mengganti wadah container tanpa downtime
#       - Health check otomatis + auto-rollback jika gagal
#
#  Penggunaan:
#    bash deploy.sh                  (deploy versi terbaru dari git)
#    bash deploy.sh --tanpa-tarik    (deploy kode yang ada saat ini)
#    bash deploy.sh --kembali        (rollback ke versi sebelumnya)
#    bash deploy.sh --setup          (jalankan setup server pertama kali)
# ==================================================================
[ -n "${BASH_VERSION:-}" ] || exec bash "$0" "$@"
set -euo pipefail

# ── Konfigurasi Dasar ─────────────────────────────────────────────
GC_NAMA="gencar"
GC_APP="${GC_APP:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
# Jika skrip dijalankan dari dalam subfolder deploy/
if [ "$(basename "$GC_APP")" = "deploy" ]; then
  GC_APP="$(cd "$GC_APP/.." && pwd)"
fi
GC_DATA="${GC_DATA:-/srv/data/gencar}"
GC_ENV="$GC_DATA/.env"
GC_PORT="${GC_PORT:-3102}"
DEPLOY_USER="deploy"

# ── Import fungsi bersama jika ada ────────────────────────────────
if [ -f "$GC_APP/deploy/umum.sh" ]; then
  . "$GC_APP/deploy/umum.sh"
else
  merah()  { printf '\033[31m%s\033[0m\n' "$*"; }
  hijau()  { printf '\033[32m%s\033[0m\n' "$*"; }
  kuning() { printf '\033[33m%s\033[0m\n' "$*"; }
  langkah() { echo; printf '\033[1m== %s\033[0m\n' "$*"; }
  berhenti() { echo; merah "BERHENTI: $*"; echo; exit 1; }
  dc() {
    docker compose --project-directory "$GC_APP" -p "$GC_NAMA" -f "$GC_APP/docker-compose.yml" "$@"
  }
  tunggu_sehat() {
    local batas=$(( $(date +%s) + ${1:-90} )) jawab
    while [ "$(date +%s)" -lt "$batas" ]; do
      jawab="$(curl -fsS --max-time 3 "http://127.0.0.1:$GC_PORT/api/health" 2>/dev/null || true)"
      case "$jawab" in *'"status":"ok"'*) echo "$jawab"; return 0 ;; esac
      sleep 2
    done
    return 1
  }
fi

USER_SEKARANG="$(id -un)"
UID_SEKARANG="$(id -u)"

# ── Flag opsi ─────────────────────────────────────────────────────
MODE="pasang"
JALANKAN_SETUP=0
DOMAIN_ARG=""

for a in "$@"; do
  case "$a" in
    --tanpa-tarik) MODE="tanpa-tarik" ;;
    --kembali|--rollback) MODE="kembali" ;;
    --setup|--init) JALANKAN_SETUP=1 ;;
    --domain) DOMAIN_ARG="${2:-}"; shift 2 ;;
    *) ;;
  esac
done

# ==================================================================
# FASE 1: Jika dijalankan oleh ROOT atau SYSADMIN (dengan akses sudo)
# ==================================================================
if [ "$UID_SEKARANG" -eq 0 ] || [ "$USER_SEKARANG" = "sysadmin" ]; then
  langkah "Terdeteksi user $USER_SEKARANG (mode administratif)"

  # Jika user minta --setup atau server belum pernah disiapkan
  if [ "$JALANKAN_SETUP" -eq 1 ] || [ ! -d "$GC_DATA" ] || ! id "$DEPLOY_USER" >/dev/null 2>&1; then
    langkah "Menyiapkan server via deploy/setup-server.sh..."
    if [ "$UID_SEKARANG" -ne 0 ]; then
      sudo bash "$GC_APP/deploy/setup-server.sh" ${DOMAIN_ARG:+--domain "$DOMAIN_ARG"}
    else
      bash "$GC_APP/deploy/setup-server.sh" ${DOMAIN_ARG:+--domain "$DOMAIN_ARG"}
    fi
  fi

  # Pastikan direktori ada
  mkdir -p "$GC_DATA" "$GC_APP" 2>/dev/null || sudo mkdir -p "$GC_DATA" "$GC_APP"

  # Pastikan kepemilikan folder dimiliki oleh user deploy
  if id "$DEPLOY_USER" >/dev/null 2>&1; then
    if [ "$UID_SEKARANG" -eq 0 ]; then
      chown -R "$DEPLOY_USER:$DEPLOY_USER" "$GC_DATA" "$GC_APP"
    else
      sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$GC_DATA" "$GC_APP"
    fi
  fi

  # Pastikan file .env ada
  if [ ! -f "$GC_ENV" ]; then
    kuning "File $GC_ENV belum ditemukan. Membuat dari .env.example..."
    if [ -f "$GC_APP/.env.example" ]; then
      if [ "$UID_SEKARANG" -eq 0 ]; then
        cp "$GC_APP/.env.example" "$GC_ENV"
        chown "$DEPLOY_USER:$DEPLOY_USER" "$GC_ENV"
        chmod 600 "$GC_ENV"
      else
        sudo cp "$GC_APP/.env.example" "$GC_ENV"
        sudo chown "$DEPLOY_USER:$DEPLOY_USER" "$GC_ENV"
        sudo chmod 600 "$GC_ENV"
      fi
      kuning "⚠️  File $GC_ENV telah dibuat. Pastikan untuk mengisi kredensial database (Turso/libSQL)!"
    fi
  fi

  # Alihkan eksekusi ke user deploy agar Docker berjalan aman tanpa hak root
  langkah "Mengalihkan proses deploy ke user '$DEPLOY_USER'..."
  if [ "$UID_SEKARANG" -eq 0 ]; then
    exec sudo -u "$DEPLOY_USER" -H bash "$0" "$@"
  else
    exec sudo -u "$DEPLOY_USER" -H bash "$0" "$@"
  fi
fi

# ==================================================================
# FASE 2: Dijalankan sebagai user DEPLOY (atau non-root)
# ==================================================================
cd "$GC_APP"

docker info >/dev/null 2>&1 || berhenti "User '$USER_SEKARANG' tidak dapat mengakses Docker. Minta sysadmin memasukkan ke grup docker."

[ -r "$GC_ENV" ] || kuning "Peringatan: $GC_ENV belum ada. Menggunakan environment default atau .env.local jika ada."

AKTIF="$(cat "$GC_DATA/.tag-aktif" 2>/dev/null || true)"
SEBELUM="$(cat "$GC_DATA/.tag-sebelumnya" 2>/dev/null || true)"
versi_paket() { sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -n 1; }

nyalakan() {
  local TAG="$1"
  GC_TAG="$TAG" dc up -d --remove-orphans app >/dev/null
  tunggu_sehat 90
}

# ── Mode Rollback ─────────────────────────────────────────────────
if [ "$MODE" = "kembali" ]; then
  [ -n "$SEBELUM" ] || berhenti "Tidak ada versi sebelumnya untuk di-rollback."
  langkah "Rollback ke versi $SEBELUM (saat ini aktif: $AKTIF)"
  if nyalakan "$SEBELUM"; then
    echo "$SEBELUM" > "$GC_DATA/.tag-aktif"
    echo "$AKTIF" > "$GC_DATA/.tag-sebelumnya"
    hijau "✅ Selesai: Rollback berhasil, versi $SEBELUM aktif."
    exit 0
  fi
  dc logs --tail 60 app || true
  berhenti "Gagal menyalakan versi sebelumnya ($SEBELUM)."
fi

# ── Mode Pasang / Deploy ──────────────────────────────────────────
if [ "$MODE" = "pasang" ] && [ -d ".git" ]; then
  langkah "1. Mengambil kode terbaru dari Git (git pull)"
  if ! git diff --quiet || ! git diff --cached --quiet; then
    git status --short
    kuning "Peringatan: Ada perubahan lokal di server. Menyimpan stash otomatis..."
    git stash
  fi
  git pull --ff-only || kuning "git pull tidak fast-forward atau gagal. Melanjutkan build lokal saat ini."
fi

TAG="$(git rev-parse --short=12 HEAD 2>/dev/null || date +%Y%m%d%H%M)"
VERSI="$(versi_paket 2>/dev/null || echo '1.0.0')"
echo "Versi: $VERSI (commit/tag $TAG)"

if [ "$TAG" = "$AKTIF" ] && [ "$MODE" = "pasang" ]; then
  if tunggu_sehat 5 >/dev/null 2>&1; then
    hijau "Versi ini ($TAG) sudah berjalan dan sehat. Tidak ada yang perlu diubah."
    exit 0
  fi
fi

langkah "2. Membangun Docker image (gencar:$TAG)"
docker build --pull -t "gencar:$TAG" -t "gencar:terbaru" . \
  || berhenti "Build Docker gagal — versi yang sedang aktif tidak disentuh."

langkah "3. Menyalakan container baru"
if JAWAB="$(nyalakan "$TAG")"; then
  if [ "$TAG" != "$AKTIF" ]; then
    [ -n "$AKTIF" ] && echo "$AKTIF" > "$GC_DATA/.tag-sebelumnya"
    echo "$TAG" > "$GC_DATA/.tag-aktif"
  fi
  echo
  hijau "=================================================================="
  hijau " ✅ Gencar versi $VERSI ($TAG) BERHASIL BERJALAN!"
  hijau " Container: 127.0.0.1:$GC_PORT"
  hijau " Healthcheck: OK"
  hijau "=================================================================="
  exit 0
fi

# ── Penanganan jika gagal health check ────────────────────────────
merah "Container baru ($TAG) tidak merespons /api/health dalam 90 detik."
dc logs --tail 60 app || true

if [ -n "$AKTIF" ] && [ "$AKTIF" != "$TAG" ]; then
  langkah "Memulihkan container ke versi sebelumnya ($AKTIF)..."
  if nyalakan "$AKTIF"; then
    kuning "Container lama ($AKTIF) dinyalakan kembali demi keamanan."
    exit 1
  fi
fi

berhenti "Deploy gagal dan tidak dapat memulihkan versi lama. Periksa log di atas."

#!/usr/bin/env bash
# ==================================================================
#  MEMASANG VERSI TERBARU GENCAR  (pengguna: deploy)
#
#    cd /srv/apps/gencar
#    bash deploy/deploy.sh               git pull + pasang
#    bash deploy/deploy.sh --tanpa-tarik pasang yang sudah ada di folder ini
#    bash deploy/deploy.sh --kembali     kembali ke versi sebelumnya
#
#  Urutannya:
#    1. git pull (hanya maju, tidak pernah menimpa perubahan lokal)
#    2. membangun image Docker baru (aplikasi lama tetap melayani)
#    3. mengganti wadah lama dengan yang baru (jeda beberapa detik)
#    4. memastikan versi baru menjawab /api/health. Kalau tidak dalam
#       90 detik, versi sebelumnya dinyalakan lagi otomatis.
# ==================================================================
[ -n "${BASH_VERSION:-}" ] || exec bash "$0" "$@"
set -euo pipefail
. "$(dirname "$0")/umum.sh"
pastikan_bukan_root
[ -r "$GC_ENV" ] || kuning "Peringatan: $GC_ENV belum ada. Pastikan .env.production atau GC_DATA/.env tersedia."
cd "$GC_APP"

MODE="pasang"
for a in "$@"; do
  case "$a" in
    --tanpa-tarik) MODE="tanpa-tarik" ;;
    --kembali) MODE="kembali" ;;
    *) berhenti "pilihan tidak dikenal: $a" ;;
  esac
done

AKTIF="$(cat "$GC_DATA/.tag-aktif" 2>/dev/null || true)"
SEBELUM="$(cat "$GC_DATA/.tag-sebelumnya" 2>/dev/null || true)"
versi_paket() { sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -n 1; }

nyalakan() {
  # nyalakan TAG -> 0 kalau sehat
  GC_TAG="$1" dc up -d --remove-orphans app >/dev/null
  tunggu_sehat 90
}

# ── Kembali ke versi sebelumnya ─────────────────────────────
if [ "$MODE" = kembali ]; then
  [ -n "$SEBELUM" ] || berhenti "tidak ada versi sebelumnya (belum pernah dipasang, atau baru satu kali berjalan)."
  langkah "Kembali ke versi $SEBELUM (sekarang: $AKTIF)"
  if nyalakan "$SEBELUM"; then
    echo "$SEBELUM" > "$GC_DATA/.tag-aktif"; echo "$AKTIF" > "$GC_DATA/.tag-sebelumnya"
    hijau "Selesai: versi $SEBELUM berjalan."
    exit 0
  fi
  dc logs --tail 60 app || true
  berhenti "versi $SEBELUM juga tidak mau menyala. Lihat catatan di atas."
fi

if [ "$MODE" = pasang ]; then
  langkah "Mengambil versi terbaru (git pull)"
  if ! git diff --quiet || ! git diff --cached --quiet; then
    git status --short
    berhenti "ada berkas program yang diubah langsung di server. Program hanya boleh berubah lewat git (commit di laptop, push, lalu deploy). Kembalikan dengan: git checkout -- ."
  fi
  git pull --ff-only
fi

TAG="$(git rev-parse --short=12 HEAD)"
VERSI="$(versi_paket)"
echo "Versi: $VERSI  (commit $TAG)"
if [ "$TAG" = "$AKTIF" ] && [ "$MODE" = pasang ]; then
  if tunggu_sehat 5 >/dev/null; then hijau "Versi ini sudah berjalan. Tidak ada yang perlu dipasang."; exit 0; fi
fi

langkah "Membangun image Docker"
docker build --pull -t "gencar:$TAG" -t gencar:terbaru . \
  || berhenti "image gagal dibangun - versi yang sedang berjalan tidak disentuh."

langkah "Menyalakan versi baru"
if JAWAB="$(nyalakan "$TAG")"; then
  if [ "$TAG" != "$AKTIF" ]; then
    [ -n "$AKTIF" ] && echo "$AKTIF" > "$GC_DATA/.tag-sebelumnya"
    echo "$TAG" > "$GC_DATA/.tag-aktif"
  fi
  hijau "Selesai: Gencar versi $VERSI (commit $TAG) berjalan di 127.0.0.1:$GC_PORT."
  exit 0
fi

# Gagal → kembalikan versi sebelumnya
merah "Versi baru ($TAG) tidak menjawab /api/health dalam 90 detik."
dc logs --tail 60 app || true
if [ -n "$AKTIF" ] && [ "$AKTIF" != "$TAG" ]; then
  langkah "Mengembalikan versi $AKTIF"
  if nyalakan "$AKTIF"; then
    hijau "Versi lama ($AKTIF) dinyalakan lagi."
    exit 1
  fi
fi
berhenti "deploy gagal dan tidak bisa mengembalikan versi lama. Lihat catatan di atas."

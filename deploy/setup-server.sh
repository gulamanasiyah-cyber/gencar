#!/usr/bin/env bash
# ==================================================================
#  MENYIAPKAN SERVER UNTUK GENCAR — Ubuntu 24.04
#  Dijalankan oleh sysadmin (atau root pada server yang benar-benar baru):
#
#    sudo bash deploy/setup-server.sh --domain gencar.pintarsolusi.com \
#         --repo git@github.com:gulamanasiyah-cyber/gencar.git [--email admin@example.com]
#
#  Pilihan lain:
#    --tanpa-https    jangan meminta sertifikat (mis. domain belum diarahkan)
#    --tanpa-ufw      jangan menyalakan firewall ufw
#
#  Aman diulang: yang sudah ada (sertifikat, .env, pengguna)
#  dipakai, tidak ditimpa. Yang dikerjakan:
#    1. paket: Docker + compose, nginx, certbot, git, ufw
#    2. pengguna: sysadmin (sudo) dan deploy (Docker, TANPA sudo)
#    3. folder: /srv/apps/gencar (program) dan
#               /srv/data/gencar (.env)
#    4. nginx sebagai reverse proxy ke 127.0.0.1:3102 + HTTPS (Let's Encrypt)
#    5. systemd service gencar.service (auto-restart on reboot)
#    6. kunci SSH untuk deploy (dipasang di GitHub sebagai Deploy key),
#       lalu git clone + pemasangan pertama kalau kuncinya sudah diterima
# ==================================================================
[ -n "${BASH_VERSION:-}" ] || exec bash "$0" "$@"
set -euo pipefail

APP_NAME="gencar"
DEPLOY_USER="deploy"
SYSADMIN_USER="sysadmin"
APP="/srv/apps/${APP_NAME}"
DATA="/srv/data/${APP_NAME}"
ENVF="$DATA/.env"
PORT=3102

DOMAIN=""; REPO=""; EMAIL=""; HTTPS=1; UFW=1
while [ $# -gt 0 ]; do
  case "$1" in
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --repo) REPO="${2:-}"; shift 2 ;;
    --email) EMAIL="${2:-}"; shift 2 ;;
    --tanpa-https) HTTPS=0; shift ;;
    --tanpa-ufw) UFW=0; shift ;;
    -h|--help) sed -n '3,26p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "pilihan tidak dikenal: $1 (lihat --help)"; exit 1 ;;
  esac
done

[ "$(id -u)" = 0 ] || { echo "jalankan dengan sudo:  sudo bash $0 ..."; exit 1; }

merah()  { printf '\033[31m%s\033[0m\n' "$*"; }
hijau()  { printf '\033[32m%s\033[0m\n' "$*"; }
kuning() { printf '\033[33m%s\033[0m\n' "$*"; }
langkah() { echo; printf '\033[1m== %s\033[0m\n' "$*"; }

# ------------------------------------------------------------------
langkah "1. Memasang paket"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
PAKET=(ca-certificates curl git gzip nginx certbot ufw openssl)
command -v docker >/dev/null 2>&1 || PAKET+=(docker.io)
apt-get install -y -q "${PAKET[@]}"
systemctl enable --now docker

# ------------------------------------------------------------------
langkah "2. Pengguna: $SYSADMIN_USER dan $DEPLOY_USER"

if ! id "$SYSADMIN_USER" >/dev/null 2>&1; then
  adduser --gecos "" "$SYSADMIN_USER"
fi
usermod -aG sudo,docker "$SYSADMIN_USER" 2>/dev/null || true

if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  mkdir -p /home/$DEPLOY_USER/.ssh
  chmod 700 /home/$DEPLOY_USER/.ssh
  chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
fi
usermod -aG docker "$DEPLOY_USER" 2>/dev/null || true

hijau "  $SYSADMIN_USER (sudo + docker), $DEPLOY_USER (docker saja)"

# ------------------------------------------------------------------
langkah "3. Direktori"
mkdir -p "$APP" "$DATA"
chown $DEPLOY_USER:$DEPLOY_USER "$APP" "$DATA"
chmod 755 "$APP" "$DATA"
hijau "  $APP (program), $DATA (.env)"

# ------------------------------------------------------------------
langkah "4. .env"
if [ ! -f "$ENVF" ]; then
  cat > "$ENVF" << 'ENVEOF'
# Gencar — environment production
# Diisi oleh sysadmin/deploy setelah setup-server.sh selesai.
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
PORT=3102
NEXT_PUBLIC_APP_URL=https://DOMAIN_ANDA

# JWT (WAJIB ganti! generate: openssl rand -base64 64)
JWT_SECRET=GANTI_KE_RANDOM_STRING_MIN_64_KARAKTER

# Turso Database
TURSO_DATABASE_URL=libsql://YOUR_DB.turso.io
TURSO_AUTH_TOKEN=your_production_token

# Cloudinary Config
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Pusher Config
PUSHER_APP_ID=your_app_id
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
NEXT_PUBLIC_PUSHER_CLUSTER=ap1
ENVEOF
  chown $DEPLOY_USER:$DEPLOY_USER "$ENVF"
  chmod 600 "$ENVF"
  kuning "  $ENVF dibuat — ISI DULU sebelum deploy!"
else
  hijau "  $ENVF sudah ada, tidak ditimpa."
fi

# ------------------------------------------------------------------
if [ $UFW -eq 1 ]; then
  langkah "5. Firewall (UFW)"
  ufw --force reset >/dev/null
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow ssh
  ufw allow 80/tcp comment "HTTP (nginx)"
  ufw allow 443/tcp comment "HTTPS (nginx)"
  ufw --force enable
  hijau "  UFW: SSH, 80, 443"
fi

# ------------------------------------------------------------------
langkah "6. Nginx reverse proxy"
WEBROOT="$APP"
SERVER_NAME="${DOMAIN:-_}"

# Buat halaman "sedang diperbarui"
mkdir -p "$WEBROOT"
cat > "$WEBROOT/sedang-diperbarui.html" << 'HTML'
<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sedang Diperbarui</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0f4f8;color:#333}
.c{text-align:center;padding:2rem}h1{font-size:1.5rem}p{color:#666}</style>
</head><body><div class="c"><h1>🔄 Sedang Diperbarui</h1><p>Aplikasi sedang diperbarui. Silakan coba lagi dalam beberapa saat.</p></div></body></html>
HTML
chown $DEPLOY_USER:$DEPLOY_USER "$WEBROOT/sedang-diperbarui.html"

# Tulis konfigurasi nginx
SINI="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SINI/nginx/gencar.conf" ]; then
  sed -e "s|@SERVER_NAME@|$SERVER_NAME|g" \
      -e "s|@DOMAIN@|${DOMAIN:-localhost}|g" \
      -e "s|@PORT@|$PORT|g" \
      -e "s|@WEBROOT@|$WEBROOT|g" \
      -e "s|@TANGGAL@|$(date)|g" \
      "$SINI/nginx/gencar.conf" > /etc/nginx/sites-available/gencar.conf

  ln -sf /etc/nginx/sites-available/gencar.conf /etc/nginx/sites-enabled/gencar.conf
  rm -f /etc/nginx/sites-enabled/default

  if nginx -t 2>/dev/null; then
    systemctl reload nginx
    hijau "  nginx dikonfigurasi: $SERVER_NAME -> 127.0.0.1:$PORT"
  else
    kuning "  nginx -t gagal (mungkin sertifikat belum ada). Jalankan lagi setelah certbot."
  fi
else
  kuning "  Template nginx tidak ditemukan di $SINI/nginx/gencar.conf"
fi

# ------------------------------------------------------------------
if [ $HTTPS -eq 1 ] && [ -n "$DOMAIN" ]; then
  langkah "7. Sertifikat HTTPS (Let's Encrypt)"
  EMAIL_FLAG=""
  [ -n "$EMAIL" ] && EMAIL_FLAG="--email $EMAIL" || EMAIL_FLAG="--register-unsafely-without-email"

  if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    certbot certonly --webroot -w "$WEBROOT" \
      -d "$DOMAIN" $EMAIL_FLAG --agree-tos --non-interactive \
      || kuning "  certbot gagal — jalankan lagi setelah DNS diarahkan."
  else
    hijau "  Sertifikat sudah ada."
  fi

  # Reload nginx setelah sertifikat
  nginx -t 2>/dev/null && systemctl reload nginx
fi

# ------------------------------------------------------------------
langkah "8. Systemd service"
cat > /etc/systemd/system/gencar.service << EOF
[Unit]
Description=Gencar App (Docker Compose)
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=$DEPLOY_USER
WorkingDirectory=$APP
ExecStartPre=/usr/bin/docker compose pull --ignore-pull-failures
ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose down --timeout 30
ExecReload=/usr/bin/docker compose up -d --remove-orphans
TimeoutStartSec=120
TimeoutStopSec=60
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable gencar.service
hijau "  gencar.service dipasang & diaktifkan."

# ------------------------------------------------------------------
langkah "9. Kunci SSH untuk deploy"
DEPLOY_SSH="/home/$DEPLOY_USER/.ssh"
if [ ! -f "$DEPLOY_SSH/id_ed25519" ]; then
  sudo -u "$DEPLOY_USER" ssh-keygen -t ed25519 -N "" -f "$DEPLOY_SSH/id_ed25519" -C "deploy@$(hostname)"
  hijau "  Kunci SSH dibuat."
  echo
  kuning "  Salin kunci publik ini ke GitHub (Settings → Deploy keys):"
  echo
  cat "$DEPLOY_SSH/id_ed25519.pub"
  echo
else
  hijau "  Kunci SSH sudah ada."
fi

# ------------------------------------------------------------------
if [ -n "$REPO" ]; then
  langkah "10. Clone & deploy pertama"
  if [ ! -d "$APP/.git" ]; then
    if sudo -u "$DEPLOY_USER" ssh -o StrictHostKeyChecking=accept-new -T git@github.com 2>&1 | grep -q "successfully\|Hi "; then
      sudo -u "$DEPLOY_USER" git clone "$REPO" "$APP"
      hijau "  Repo di-clone ke $APP."
      echo
      kuning "  Langkah selanjutnya:"
      kuning "    1. Isi $ENVF"
      kuning "    2. sudo -iu $DEPLOY_USER"
      kuning "    3. cd $APP && bash deploy/deploy.sh --tanpa-tarik"
    else
      kuning "  Kunci SSH belum diterima GitHub. Salin kunci publik dulu, lalu:"
      kuning "    sudo -iu $DEPLOY_USER"
      kuning "    git clone $REPO $APP"
      kuning "    cd $APP && bash deploy/deploy.sh --tanpa-tarik"
    fi
  else
    hijau "  Repo sudah ada di $APP."
  fi
fi

# ------------------------------------------------------------------
echo
echo "=================================================="
hijau " ✅ Server siap!"
echo "=================================================="
echo
echo " Pengguna:"
echo "   $SYSADMIN_USER  → sudo + docker (install, maintain, firewall)"
echo "   $DEPLOY_USER    → docker saja   (clone, build, deploy)"
echo
echo " Direktori:"
echo "   App:  $APP"
echo "   Data: $DATA"
echo
echo " Port:"
echo "   SSH   : 22"
echo "   HTTP  : 80  (nginx → 127.0.0.1:$PORT)"
echo "   HTTPS : 443 (nginx → 127.0.0.1:$PORT)"
echo
echo " Systemd:"
echo "   sudo systemctl status gencar    # Cek status"
echo "   sudo systemctl restart gencar   # Restart"
echo "   sudo systemctl stop gencar      # Stop"
echo
echo " Langkah selanjutnya:"
echo "   1. Salin kunci SSH publik ke GitHub Deploy keys"
echo "   2. Isi $ENVF"
echo "   3. sudo -iu $DEPLOY_USER"
echo "   4. cd $APP && bash deploy/deploy.sh"
echo

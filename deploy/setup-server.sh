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
#  dipakai, tidak ditimpa.
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
    -h|--help) sed -n '3,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "pilihan tidak dikenal: $1 (lihat --help)"; exit 1 ;;
  esac
done

[ "$(id -u)" = 0 ] || { echo "jalankan dengan sudo:  sudo bash $0 ..."; exit 1; }

merah()  { printf '\033[31m%s\033[0m\n' "$*"; }
hijau()  { printf '\033[32m%s\033[0m\n' "$*"; }
kuning() { printf '\033[33m%s\033[0m\n' "$*"; }
langkah() { echo; printf '\033[1m== %s\033[0m\n' "$*"; }

# ------------------------------------------------------------------
langkah "1. Memasang paket sistem"
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

hijau "  ✓ $SYSADMIN_USER (sudo + docker), $DEPLOY_USER (docker saja)"

# ------------------------------------------------------------------
langkah "3. Direktori aplikasi & data"
mkdir -p "$APP" "$DATA"
chown $DEPLOY_USER:$DEPLOY_USER "$APP" "$DATA"
chmod 755 "$APP" "$DATA"
hijau "  ✓ $APP (program), $DATA (.env)"

# ------------------------------------------------------------------
langkah "4. Konfigurasi Environment (.env)"
if [ ! -f "$ENVF" ]; then
  cat > "$ENVF" << ENVEOF
# Gencar — environment production
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
PORT=3102
NEXT_PUBLIC_APP_URL=https://${DOMAIN:-DOMAIN_ANDA}

# JWT (WAJIB ganti! generate: openssl rand -base64 64)
JWT_SECRET=$(openssl rand -base64 48)

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
  kuning "  ⚠️  $ENVF dibuat — sesuaikan isi database & kredensial sebelum running."
else
  hijau "  ✓ $ENVF sudah ada, tidak ditimpa."
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
  hijau "  ✓ UFW aktif: SSH (22), HTTP (80), HTTPS (443)"
fi

# ------------------------------------------------------------------
langkah "6. Nginx reverse proxy & SSL"
WEBROOT="$APP"
SERVER_NAME="${DOMAIN:-_}"
NGX=/etc/nginx/sites-available/gencar
SINI="$(cd "$(dirname "$0")" && pwd)"

# Siapkan folder webroot dan challenge
mkdir -p "$WEBROOT/.well-known/acme-challenge"
chmod -R 755 "$WEBROOT"
chown -R $DEPLOY_USER:$DEPLOY_USER "$WEBROOT"

# Siapkan halaman maintenance
if [ -f "$SINI/nginx/sedang-diperbarui.html" ]; then
  cp "$SINI/nginx/sedang-diperbarui.html" "$WEBROOT/sedang-diperbarui.html"
fi

pasang_nginx() {
  local TEMPLATE="$1"
  sed -e "s|@SERVER_NAME@|$SERVER_NAME|g" \
      -e "s|@DOMAIN@|${DOMAIN:-localhost}|g" \
      -e "s|@PORT@|$PORT|g" \
      -e "s|@WEBROOT@|$WEBROOT|g" \
      -e "s|@TANGGAL@|$(date +%F)|g" \
      "$SINI/nginx/$TEMPLATE" > "$NGX"

  # Server tanpa IPv6: hapus baris listen [::] agar Nginx tidak error
  [ -f /proc/net/if_inet6 ] || sed -i '/listen \[::\]/d' "$NGX"

  ln -sf "$NGX" /etc/nginx/sites-enabled/gencar
  rm -f /etc/nginx/sites-enabled/default
  nginx -t -q && systemctl reload nginx
}

SERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

if [ -n "$DOMAIN" ] && [ -f "$SERT" ]; then
  pasang_nginx https.conf
  hijau "  ✓ Nginx: https://$DOMAIN (menggunakan sertifikat SSL yang sudah ada)"
else
  # Pasang HTTP dulu agar Nginx aktif di port 80 dan bisa melayani tantangan Certbot
  pasang_nginx http.conf
  hijau "  ✓ Nginx: http://$SERVER_NAME aktif di port 80"

  if [ -n "$DOMAIN" ] && [ "$HTTPS" -eq 1 ]; then
    langkah "7. Meminta sertifikat HTTPS (Let's Encrypt via Certbot)"
    EMAIL_FLAG=""
    [ -n "$EMAIL" ] && EMAIL_FLAG="-m $EMAIL" || EMAIL_FLAG="--register-unsafely-without-email"

    if certbot certonly --webroot -w "$WEBROOT" \
      -d "$DOMAIN" $EMAIL_FLAG --agree-tos --non-interactive; then
      pasang_nginx https.conf
      hijau "  ✅ Sertifikat SSL berhasil! HTTPS terpasang: https://$DOMAIN"
    else
      kuning "  ⚠️  Certbot belum berhasil menerbitkan sertifikat SSL."
      kuning "     Website tetap dapat diakses sementara via HTTP: http://$DOMAIN"
      kuning "     TIPS jika domain menggunakan Cloudflare (Proxy/Awan Oranye aktif):"
      kuning "     1. Ubah sementara DNS record $DOMAIN di Cloudflare ke 'DNS only' (Awan Abu-abu)."
      kuning "     2. Jalankan ulang perintah: sudo bash deploy/setup-server.sh --domain $DOMAIN"
      kuning "     3. Setelah sertifikat terbit, aktifkan kembali Proxy Cloudflare."
    fi
  else
    kuning "  Website berjalan via HTTP di http://$SERVER_NAME"
  fi
fi

# Auto-reload Nginx setiap perpanjangan sertifikat
install -d /etc/letsencrypt/renewal-hooks/deploy 2>/dev/null || true
cat > /etc/letsencrypt/renewal-hooks/deploy/gencar-nginx.sh <<'EOF'
#!/bin/sh
systemctl reload nginx
EOF
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/gencar-nginx.sh 2>/dev/null || true

# ------------------------------------------------------------------
langkah "8. Systemd service (Auto-restart on reboot)"
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
hijau "  ✓ gencar.service dipasang & diaktifkan."

# ------------------------------------------------------------------
langkah "9. Kunci SSH untuk deploy"
DEPLOY_SSH="/home/$DEPLOY_USER/.ssh"
if [ ! -f "$DEPLOY_SSH/id_ed25519" ]; then
  sudo -u "$DEPLOY_USER" ssh-keygen -t ed25519 -N "" -f "$DEPLOY_SSH/id_ed25519" -C "deploy@$(hostname)"
  hijau "  ✓ Kunci SSH dibuat."
  echo
  kuning "  Salin kunci publik ini ke GitHub (Settings → Deploy keys):"
  echo
  cat "$DEPLOY_SSH/id_ed25519.pub"
  echo
else
  hijau "  ✓ Kunci SSH sudah ada."
fi

# ------------------------------------------------------------------
if [ -n "$REPO" ]; then
  langkah "10. Clone repository"
  if [ ! -d "$APP/.git" ]; then
    if sudo -u "$DEPLOY_USER" ssh -o StrictHostKeyChecking=accept-new -T git@github.com 2>&1 | grep -q "successfully\|Hi "; then
      sudo -u "$DEPLOY_USER" git clone "$REPO" "$APP"
      hijau "  ✓ Repo di-clone ke $APP."
    else
      kuning "  Kunci SSH belum diterima GitHub. Salin kunci publik di atas ke GitHub Deploy keys,"
      kuning "  kemudian jalankan: sudo -iu $DEPLOY_USER git clone $REPO $APP"
    fi
  else
    hijau "  ✓ Repo sudah ada di $APP."
  fi
fi

# ------------------------------------------------------------------
echo
echo "=================================================="
hijau " ✅ Persiapan Server Selesai!"
echo "=================================================="
echo " Langkah selanjutnya untuk deploy aplikasi:"
echo "   1. Isi kredensial DB di $ENVF"
echo "   2. Jalankan: bash deploy.sh"
echo "=================================================="

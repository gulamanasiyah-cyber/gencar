#!/usr/bin/env bash
# =============================================================
# setup-server.sh — One-time Ubuntu 24 server setup
# Run as: sysadmin (sudo)
# =============================================================
set -euo pipefail

APP_NAME="gencar"
DEPLOY_USER="deploy"
APP_ROOT="/srv/apps/${APP_NAME}"
DATA_ROOT="/srv/data/${APP_NAME}"

echo "==> [1/7] Updating system packages..."
apt-get update && apt-get upgrade -y

echo "==> [2/7] Installing dependencies..."
apt-get install -y \
  curl wget git unzip \
  nginx certbot python3-certbot-nginx \
  ufw fail2ban \
  ca-certificates gnupg lsb-release

echo "==> [3/7] Installing Docker Engine..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker

echo "==> [4/7] Creating users..."
# sysadmin (sudoer — skip if already exists)
if ! id "sysadmin" &>/dev/null; then
  adduser --gecos "" sysadmin
  usermod -aG sudo,docker sysadmin
  echo "  ✓ sysadmin created"
else
  echo "  ✓ sysadmin already exists"
fi

# deploy user (no sudo, docker access only)
if ! id "${DEPLOY_USER}" &>/dev/null; then
  adduser --disabled-password --gecos "" "${DEPLOY_USER}"
  usermod -aG docker "${DEPLOY_USER}"
  mkdir -p /home/${DEPLOY_USER}/.ssh
  chmod 700 /home/${DEPLOY_USER}/.ssh
  echo "  ✓ ${DEPLOY_USER} created"
  echo "  ⚠  Copy your deploy SSH public key to /home/${DEPLOY_USER}/.ssh/authorized_keys"
else
  echo "  ✓ ${DEPLOY_USER} already exists"
fi

echo "==> [5/7] Creating directory structure..."
mkdir -p "${APP_ROOT}"/{releases,shared,logs}
mkdir -p "${DATA_ROOT}"/{uploads,ssl,certbot/www}
chown -R ${DEPLOY_USER}:${DEPLOY_USER} /srv/apps /srv/data
chmod -R 755 /srv/apps /srv/data
echo "  ✓ Directories created"

echo "==> [6/7] Firewall (UFW)..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "  ✓ UFW configured"

echo "==> [7/7] Nginx base config..."
systemctl enable --now nginx
# Remove default site
rm -f /etc/nginx/sites-enabled/default

echo ""
echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "  1. Add deploy user's SSH pubkey: /home/${DEPLOY_USER}/.ssh/authorized_keys"
echo "  2. Copy .env.production to ${APP_ROOT}/shared/.env.production"
echo "  3. Run deploy.sh as ${DEPLOY_USER}"
echo "  4. Run: certbot --nginx -d gencar.my.id"

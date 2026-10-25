#!/usr/bin/env bash
# =============================================================
# deploy.sh — Deploy gencar app
# Run as: deploy user
# Usage: ./deploy.sh [git-branch]
# =============================================================
set -euo pipefail

APP_NAME="gencar"
REPO_URL="git@github.com:https://github.com/gulamanasiyah-cyber/gencar.git"   # ← ganti ini
BRANCH="${1:-main}"
APP_ROOT="/srv/apps/${APP_NAME}"
DATA_ROOT="/srv/data/${APP_NAME}"
RELEASE_DIR="${APP_ROOT}/releases/$(date +%Y%m%d-%H%M%S)"
SHARED_DIR="${APP_ROOT}/shared"
CURRENT_LINK="${APP_ROOT}/current"
KEEP_RELEASES=3

echo "=================================================="
echo " 🚀 Deploying ${APP_NAME} from branch: ${BRANCH}"
echo "=================================================="

# ── 1. Clone fresh release ──────────────────────────────────
echo "[1/6] Cloning repository..."
git clone --depth 1 --branch "${BRANCH}" "${REPO_URL}" "${RELEASE_DIR}"

# ── 2. Link shared .env.production ─────────────────────────
echo "[2/6] Linking shared env..."
ln -sf "${SHARED_DIR}/.env.production" "${RELEASE_DIR}/.env.production"

# ── 3. Link Nginx config ────────────────────────────────────
echo "[3/6] Linking Nginx config..."
cp "${RELEASE_DIR}/deploy/nginx/gencar.conf" /etc/nginx/conf.d/gencar.conf 2>/dev/null || true

# ── 4. Build Docker image ───────────────────────────────────
echo "[4/6] Building Docker image..."
cd "${RELEASE_DIR}"
docker compose build --no-cache app

# ── 5. Swap current symlink & restart ───────────────────────
echo "[5/6] Switching release..."
ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"
cd "${CURRENT_LINK}"

# Copy .env.production to current dir for docker compose
cp "${SHARED_DIR}/.env.production" "${CURRENT_LINK}/.env.production"

docker compose up -d --remove-orphans
docker compose ps

# ── 6. Cleanup old releases ─────────────────────────────────
echo "[6/6] Cleaning old releases (keep last ${KEEP_RELEASES})..."
ls -1dt "${APP_ROOT}/releases"/*/  | tail -n +$((KEEP_RELEASES + 1)) | xargs rm -rf || true

echo ""
echo "✅ Deploy complete!"
echo "   Release: ${RELEASE_DIR}"
echo "   App:     http://localhost:5315"

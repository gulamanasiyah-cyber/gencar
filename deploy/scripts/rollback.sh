#!/usr/bin/env bash
# =============================================================
# rollback.sh — Rollback ke release sebelumnya
# Run as: deploy user
# =============================================================
set -euo pipefail

APP_NAME="gencar"
APP_ROOT="/srv/apps/${APP_NAME}"
CURRENT_LINK="${APP_ROOT}/current"

RELEASES=($(ls -1dt "${APP_ROOT}/releases"/*/))
if [ ${#RELEASES[@]} -lt 2 ]; then
  echo "❌ No previous release to rollback to."
  exit 1
fi

CURRENT_RELEASE=$(readlink -f "${CURRENT_LINK}")
PREV_RELEASE="${RELEASES[1]}"

if [ "${CURRENT_RELEASE}" == "${PREV_RELEASE%/}" ]; then
  PREV_RELEASE="${RELEASES[2]}"
fi

echo "Rolling back to: ${PREV_RELEASE}"
ln -sfn "${PREV_RELEASE}" "${CURRENT_LINK}"
cd "${CURRENT_LINK}"
docker compose up -d --remove-orphans
echo "✅ Rollback complete to: ${PREV_RELEASE}"

#!/usr/bin/env bash
set -e

APP_DIR="/opt/ipam-lite"
DATA_DIR="$APP_DIR/data"
SERVICE_USER="ipam"
PORT=8082

echo "================================================="
echo "  IPAM Lite Installer"
echo "================================================="

apt-get update --allow-releaseinfo-change -qq 2>/dev/null || apt-get update -qq 2>/dev/null || true
apt-get install -y --no-install-recommends python3 python3-venv python3-pip nginx curl

id -u $SERVICE_USER &>/dev/null || useradd --system --no-create-home --shell /bin/false $SERVICE_USER

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$APP_DIR" "$DATA_DIR"
cp -r "$SCRIPT_DIR/backend/"* "$APP_DIR/"
cp -r "$SCRIPT_DIR/frontend" "$APP_DIR/"

chown -R $SERVICE_USER:$SERVICE_USER "$APP_DIR"
chmod -R 755 "$APP_DIR"
chmod 700 "$DATA_DIR"

python3 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install --quiet --upgrade pip
"$APP_DIR/venv/bin/pip" install --quiet -r "$APP_DIR/requirements.txt"

cp "$SCRIPT_DIR/systemd/ipam.service" /etc/systemd/system/ipam-lite.service
sed -i 's#/opt/ipam#/opt/ipam-lite#g' /etc/systemd/system/ipam-lite.service
sed -i 's#ExecStart=.*#ExecStart=/opt/ipam-lite/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8082 --workers 1#' /etc/systemd/system/ipam-lite.service
systemctl daemon-reload
systemctl enable ipam-lite
systemctl restart ipam-lite

echo "Done. Check with: systemctl status ipam-lite"

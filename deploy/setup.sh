#!/bin/bash
# ============================================
# SRAAP Portal - EC2 Setup Script
# Run this script on a fresh Ubuntu EC2 instance
# ============================================

set -euo pipefail

APP_NAME="sraapportal"
APP_DIR="/var/www/${APP_NAME}"
SOURCE_DIR="${HOME}/sraapportal"
MONGO_DB="sru_portal"
MONGO_APP_USER="sraap_user"
MONGO_APP_PASSWORD="change_me_sraap_db_pass"
BACKEND_PORT="3000"
PM2_NAME="sraap-backend"

echo "Setting up SRAAP Portal..."
echo "==========================================="

# --- Update system ---
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# --- Install Node.js 20.x ---
echo "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# --- Install MongoDB ---
echo "Installing MongoDB 7.0..."
if ! command -v mongod >/dev/null 2>&1; then
  CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${CODENAME}/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list >/dev/null
  sudo apt update
  sudo apt install -y mongodb-org
fi
sudo systemctl enable mongod
sudo systemctl start mongod

# --- Install Nginx ---
echo "Installing Nginx..."
sudo apt install -y nginx

# --- Install PM2 (process manager) ---
echo "Installing PM2..."
sudo npm install -g pm2

# --- Configure MongoDB ---
echo "Configuring MongoDB..."
mongosh --quiet <<EOF
use admin
if (!db.getUser("${MONGO_APP_USER}")) {
  db.createUser({
    user: "${MONGO_APP_USER}",
    pwd: "${MONGO_APP_PASSWORD}",
    roles: [{ role: "readWrite", db: "${MONGO_DB}" }]
  })
}
use ${MONGO_DB}
db.createCollection("app_init")
EOF

echo "MongoDB configured"

# --- Set up project directory ---
echo "Setting up project..."
sudo mkdir -p "${APP_DIR}"
sudo chown -R "$USER":"$USER" "${APP_DIR}"

if [ ! -d "${SOURCE_DIR}" ]; then
  echo "Source directory not found: ${SOURCE_DIR}"
  echo "Clone the repository first to ${SOURCE_DIR} and rerun."
  exit 1
fi

rsync -a --delete --exclude ".git" "${SOURCE_DIR}/" "${APP_DIR}/"

# --- Install backend dependencies ---
echo "Installing backend dependencies..."
cd "${APP_DIR}/backend"
npm ci --omit=dev

if [ ! -f "${APP_DIR}/backend/.env" ]; then
  cp "${APP_DIR}/backend/.env.example" "${APP_DIR}/backend/.env"
fi

PUBLIC_IP="$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo localhost)"
MONGO_URI="mongodb://${MONGO_APP_USER}:${MONGO_APP_PASSWORD}@127.0.0.1:27017/${MONGO_DB}?authSource=admin"

sed -i "s|^MONGO_URI=.*|MONGO_URI=${MONGO_URI}|" "${APP_DIR}/backend/.env"
sed -i "s|^BASE_URL=.*|BASE_URL=http://${PUBLIC_IP}|" "${APP_DIR}/backend/.env"
sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=http://${PUBLIC_IP}|" "${APP_DIR}/backend/.env"

# --- Prepare frontend ---
echo "Preparing frontend static files..."
if [ ! -f "${APP_DIR}/frontend/index.html" ]; then
  echo "Frontend files not found in ${APP_DIR}/frontend"
  exit 1
fi

# --- Configure Nginx ---
echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/${APP_NAME} >/dev/null <<EOF
server {
  listen 80;
  server_name _;

  root ${APP_DIR}/frontend;
  index index.html;

  # Frontend - serve static files
  location / {
    try_files \$uri \$uri/ /index.html;
  }

  # Backend API proxy
  location /api/ {
    proxy_pass http://127.0.0.1:${BACKEND_PORT};
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_cache_bypass \$http_upgrade;
  }
}
EOF

sudo ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/${APP_NAME}
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# --- Start backend with PM2 ---
echo "Starting backend with PM2..."
cd "${APP_DIR}/backend"
pm2 delete ${PM2_NAME} >/dev/null 2>&1 || true
pm2 start src/server.js --name ${PM2_NAME}
pm2 save
pm2 startup systemd -u "$USER" --hp "/home/$USER" | tail -1 | sudo bash

echo ""
echo "==========================================="
echo "SRAAP is now live!"
echo "==========================================="
echo ""
echo "Access your portal at: http://${PUBLIC_IP}"
echo "Backend health at: http://${PUBLIC_IP}/health"
echo ""
echo "Useful commands:"
echo "  pm2 status"
echo "  pm2 logs ${PM2_NAME}"
echo "  pm2 restart ${PM2_NAME}"
echo "  sudo systemctl restart nginx"
echo ""

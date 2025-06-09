#!/bin/bash

echo "🚀 Starting Smart Sites installation..."

# Prompt for site name
read -p "Enter your Smart Site name: " SITE_NAME
read -p "Enter frontend port [3000]: " FRONTEND_PORT
read -p "Enter backend port [4000]: " BACKEND_PORT

FRONTEND_PORT=${FRONTEND_PORT:-3000}
BACKEND_PORT=${BACKEND_PORT:-4000}

# Save config
mkdir -p config
echo "{\"siteName\": \"$SITE_NAME\", \"frontendPort\": $FRONTEND_PORT, \"backendPort\": $BACKEND_PORT}" > config/config.json

echo "🔧 Updating system..."
sudo apt update && sudo apt upgrade -y

echo "📦 Installing dependencies..."
sudo apt install -y git curl nodejs npm sqlite3 mosquitto mosquitto-clients unzip net-tools

# Fix Node if needed
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
fi

echo "📁 Cloning Smart Sites repo (skipped if already cloned)..."
if [ ! -d "smart-sites" ]; then
  git clone git@github.com:smartsites-aus/smart-sites.git
fi

cd smart-sites || { echo "❌ Failed to enter smart-sites directory."; exit 1; }

echo "📦 Installing backend dependencies..."
cd backend && npm install || echo "⚠️ Backend dependencies failed."
cd ..

echo "📦 Installing frontend dependencies..."
cd frontend && npm install || echo "⚠️ Frontend dependencies failed."
npm run build || echo "⚠️ Frontend build failed."
cd ..

echo "🗄️ Creating database..."
if [ -f config/schema.sql ]; then
  sqlite3 data.db < config/schema.sql
else
  echo "⚠️ Schema file not found."
fi

echo "📛 Installing PM2..."
sudo npm install -g pm2

echo "📡 Installing ESPHome in a venv..."
sudo apt install -y python3-full python3-venv
python3 -m venv esphome-venv
source esphome-venv/bin/activate
pip install --upgrade pip
pip install esphome
deactivate

echo "🚀 Starting backend and frontend via PM2..."
cd backend && pm2 start server.js --name smart-sites-backend -- --port $BACKEND_PORT && cd ..
cd frontend && pm2 serve dist $FRONTEND_PORT --spa --name smart-sites-frontend && cd ..

echo "💾 Saving PM2 startup config..."
pm2 save
pm2 startup | bash

echo "✅ Smart Sites installation complete!"
echo "Frontend: http://<your-pi-ip>:$FRONTEND_PORT"
echo "Backend:  http://<your-pi-ip>:$BACKEND_PORT"

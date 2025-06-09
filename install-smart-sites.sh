#!/bin/bash

echo "🚀 Starting Smart Sites setup..."

# ==== Update and install dependencies ====
echo "🔄 Updating system..."
sudo apt-get update && sudo apt-get upgrade -y

echo "📦 Installing system packages..."
sudo apt-get install -y git curl sqlite3 net-tools build-essential avahi-daemon libnss-mdns

# ==== Install Node.js & npm ====
echo "🟢 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# ==== Clone Smart Sites repository ====
echo "📁 Cloning Smart Sites repo..."
git clone https://github.com/YOUR-USERNAME/smart-sites.git
cd smart-sites

# ==== Install backend dependencies ====
echo "🔧 Installing backend dependencies..."
cd backend
npm install

# ==== Setup SQLite database ====
echo "🗄️ Creating SQLite database..."
mkdir -p data
sqlite3 data/smart-sites.db < schema.sql

# ==== Install PM2 process manager ====
echo "⚙️ Installing pm2..."
sudo npm install -g pm2
pm2 start server.js
pm2 startup
pm2 save

# ==== Setup Z-Wave JS UI with Docker ====
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

echo "📡 Pulling Z-Wave JS UI container..."
docker pull zwavejs/zwave-js-ui:latest

echo "🚀 Starting Z-Wave JS UI container..."
docker run -d \
  --name zwave-js-ui \
  --restart unless-stopped \
  -e SESSION_SECRET=mysmartsecret \
  -e ZWAVEJS_EXTERNAL_CONFIG=true \
  -p 8091:8091 \
  -p 3000:3000 \
  --device=/dev/ttyUSB0 \
  zwavejs/zwave-js-ui:latest

# ==== Setup ESPHome with Docker ====
echo "📦 Installing ESPHome via Docker..."
docker pull ghcr.io/esphome/esphome

echo "🚀 Starting ESPHome container..."
docker run -d \
  --name esphome \
  --restart=unless-stopped \
  --net=host \
  -v "$HOME/esphome-config":/config \
  --privileged \
  ghcr.io/esphome/esphome

echo "✅ ESPHome is now available at: http://<your-pi-ip>:6052"

# ==== Build frontend ====
echo "🌐 Installing frontend dependencies..."
cd ../frontend
npm install

echo "🛠️ Building frontend..."
npm run build

# ==== Move build to backend for serving ====
echo "📁 Copying frontend build to backend..."
cp -r build ../backend/public

# ==== Done ====
echo ""
echo "✅ Smart Sites setup complete!"
echo "➡️  Backend server running via pm2"
echo "➡️  Z-Wave JS UI available at: http://<your-pi-ip>:8091"
echo "➡️  ESPHome available at: http://<your-pi-ip>:6052"
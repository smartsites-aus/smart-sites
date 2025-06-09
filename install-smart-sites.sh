#!/bin/bash

echo "📦 Installing dependencies..."
sudo apt update && sudo apt install -y nodejs npm sqlite3 mosquitto mosquitto-clients git curl

echo "📁 Cloning Smart Sites repo (skipped if already cloned)..."
if [ ! -d "smart-sites" ]; then
  git clone git@github.com:smartsites-aus/smart-sites.git
fi

cd smart-sites || exit

echo "📝 Saving config..."
mkdir -p config
echo "{\"siteName\": \"Default Site\", \"frontendPort\": 3000, \"backendPort\": 4000}" > config/config.json

echo "📦 Installing backend..."
cd backend && npm install && cd ..

echo "📦 Installing frontend..."
cd frontend && npm install && npm run build && cd ..

echo "🗄️ Creating database..."
sqlite3 data.db < config/schema.sql

echo "✅ Done! Start backend with: cd backend && npm start"

#!/bin/bash
# smart-sites/frontend/serve-frontend.sh

echo "➡️  Building frontend with Vite..."
npm run build

echo "🚀 Serving frontend on port 3000..."
serve -s dist -l 3000

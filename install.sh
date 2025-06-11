#!/bin/bash

# Smart Sites Installation Script for Raspberry Pi

set -e

echo "🏗️  Smart Sites Installation Script"
echo "=================================="

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    echo "⚠️  Warning: This script is optimized for Raspberry Pi"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install system dependencies
echo "🔧 Installing system dependencies..."
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    sqlite3 \
    git \
    nginx \
    redis-server \
    supervisor

# Create smart-sites user
echo "👤 Creating smart-sites user..."
if ! id "smartsites" &>/dev/null; then
    sudo useradd -m -s /bin/bash smartsites
    sudo usermod -a -G gpio,i2c,spi smartsites
fi

# Create application directory
echo "📁 Setting up application directory..."
sudo mkdir -p /opt/smart-sites
sudo chown smartsites:smartsites /opt/smart-sites

# Clone repository
echo "📥 Cloning Smart Sites repository..."
cd /opt/smart-sites
if [ ! -d ".git" ]; then
    sudo -u smartsites git clone https://github.com/yourusername/smart-sites.git .
fi

# Create virtual environment
echo "🐍 Setting up Python virtual environment..."
sudo -u smartsites python3 -m venv venv
sudo -u smartsites /opt/smart-sites/venv/bin/pip install --upgrade pip
sudo -u smartsites /opt/smart-sites/venv/bin/pip install -r requirements.txt

# Create data directories
echo "📂 Creating data directories..."
sudo -u smartsites mkdir -p /opt/smart-sites/data
sudo -u smartsites mkdir -p /opt/smart-sites/logs
sudo -u smartsites mkdir -p /opt/smart-sites/backups

# Initialize database
echo "🗄️  Initializing database..."
cd /opt/smart-sites
sudo -u smartsites /opt/smart-sites/venv/bin/python -c "
from app import app, db
with app.app_context():
    db.create_all()
    print('Database initialized successfully')
"

# Configure systemd service
echo "⚙️  Configuring systemd service..."
sudo tee /etc/systemd/system/smart-sites.service > /dev/null <<EOF
[Unit]
Description=Smart Sites Construction Site Management
After=network.target

[Service]
Type=exec
User=smartsites
Group=smartsites
WorkingDirectory=/opt/smart-sites
Environment=PATH=/opt/smart-sites/venv/bin
Environment=FLASK_ENV=production
Environment=DATABASE_URL=sqlite:////opt/smart-sites/data/smart_sites.db
ExecStart=/opt/smart-sites/venv/bin/gunicorn --bind 127.0.0.1:5000 --workers 2 app:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Configure nginx
echo "🌐 Configuring nginx..."
sudo tee /etc/nginx/sites-available/smart-sites > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /static {
        alias /opt/smart-sites/frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/smart-sites /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Enable and start services
echo "🚀 Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable smart-sites
sudo systemctl enable nginx
sudo systemctl enable redis-server

sudo systemctl start redis-server
sudo systemctl start smart-sites
sudo systemctl restart nginx

# Create backup script
echo "💾 Setting up backup script..."
sudo tee /opt/smart-sites/scripts/backup.sh > /dev/null <<EOF
#!/bin/bash
BACKUP_DIR="/opt/smart-sites/backups"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="\$BACKUP_DIR/smart_sites_backup_\$DATE.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p \$BACKUP_DIR

# Create backup
tar -czf \$BACKUP_FILE -C /opt/smart-sites data/ config/

# Keep only last 7 backups
cd \$BACKUP_DIR
ls -t smart_sites_backup_*.tar.gz | tail -n +8 | xargs -r rm

echo "Backup created: \$BACKUP_FILE"
EOF

sudo chmod +x /opt/smart-sites/scripts/backup.sh
sudo chown smartsites:smartsites /opt/smart-sites/scripts/backup.sh

# Add daily backup cron job
echo "⏰ Setting up daily backups..."
(sudo -u smartsites crontab -l 2>/dev/null; echo "0 2 * * * /opt/smart-sites/scripts/backup.sh") | sudo -u smartsites crontab -

# Get Raspberry Pi IP address
PI_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "✅ Smart Sites installation completed successfully!"
echo ""
echo "🌐 Access Smart Sites at: http://$PI_IP"
echo "👤 Default login: admin / admin123"
echo "📁 Application directory: /opt/smart-sites"
echo "📊 Logs: /opt/smart-sites/logs/"
echo ""
echo "🔧 Useful commands:"
echo "   sudo systemctl status smart-sites    # Check service status"
echo "   sudo systemctl restart smart-sites   # Restart service"
echo "   sudo journalctl -u smart-sites -f    # View logs"
echo ""
echo "⚠️  Remember to:"
echo "   1. Change the default admin password"
echo "   2. Configure your network settings"
echo "   3. Set up SSL certificates for production use"
echo ""

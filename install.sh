#!/bin/bash

# Smart Sites - Optimized Installation Script for Raspberry Pi
# Includes reliability improvements and complete setup

set -e

echo "🏗️  Smart Sites - Optimized Installation Script"
echo "=============================================="
echo "This will install Smart Sites with reliability improvements"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on Raspberry Pi
log_info "Checking system compatibility..."
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    log_warning "This script is optimized for Raspberry Pi"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root (don't use sudo)"
   log_info "Run as: ./install.sh"
   exit 1
fi

# Update system packages
log_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install system dependencies
log_info "Installing system dependencies..."
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    sqlite3 \
    git \
    nginx \
    redis-server \
    supervisor \
    curl \
    wget \
    htop \
    ufw \
    fail2ban \
    unattended-upgrades \
    rsync

# Install reliability improvements
log_info "Installing SD card reliability improvements..."

# Install log2ram to reduce SD card writes
if ! command -v log2ram &> /dev/null; then
    echo "deb [signed-by=/usr/share/keyrings/azlux-archive-keyring.gpg] http://packages.azlux.fr/debian/ bullseye main" | sudo tee /etc/apt/sources.list.d/azlux.list
    sudo wget -O /usr/share/keyrings/azlux-archive-keyring.gpg https://azlux.fr/repo.gpg
    sudo apt update
    sudo apt install -y log2ram
    
    # Configure log2ram
    sudo sed -i 's/SIZE=40M/SIZE=128M/' /etc/log2ram.conf
    sudo sed -i 's/USE_RSYNC=false/USE_RSYNC=true/' /etc/log2ram.conf
    sudo systemctl enable log2ram
    log_success "log2ram installed and configured"
fi

# Create smart-sites user if it doesn't exist
log_info "Setting up smart-sites user..."
if ! id "smartsites" &>/dev/null; then
    sudo useradd -m -s /bin/bash smartsites
    sudo usermod -a -G gpio,i2c,spi,dialout smartsites
    log_success "smartsites user created"
fi

# Create application directory
log_info "Setting up Smart Sites directory..."
sudo mkdir -p /opt/smart-sites
sudo chown smartsites:smartsites /opt/smart-sites
cd /opt/smart-sites

# Clone or update Smart Sites repository
log_info "Getting Smart Sites code..."
if [ ! -d ".git" ]; then
    sudo -u smartsites git clone https://github.com/smartsites-aus/smart-sites.git .
    log_success "Smart Sites repository cloned"
else
    sudo -u smartsites git pull origin main
    log_success "Smart Sites repository updated"
fi

# Create Python virtual environment
log_info "Setting up Python virtual environment..."
sudo -u smartsites python3 -m venv venv
sudo -u smartsites /opt/smart-sites/venv/bin/pip install --upgrade pip

# Install Python dependencies
log_info "Installing Python dependencies..."
sudo -u smartsites /opt/smart-sites/venv/bin/pip install -r requirements.txt

# Install ESPHome separately (might need special handling)
log_info "Installing ESPHome..."
sudo -u smartsites /opt/smart-sites/venv/bin/pip install esphome

# Create necessary directories
log_info "Creating data directories..."
sudo -u smartsites mkdir -p /opt/smart-sites/data
sudo -u smartsites mkdir -p /opt/smart-sites/logs
sudo -u smartsites mkdir -p /opt/smart-sites/backups
sudo -u smartsites mkdir -p /opt/smart-sites/config

# Create ESPHome config directory
sudo -u smartsites mkdir -p /opt/smart-sites/esphome
sudo -u smartsites mkdir -p /opt/smart-sites/esphome/config

# Initialize database
log_info "Initializing Smart Sites database..."
cd /opt/smart-sites
sudo -u smartsites /opt/smart-sites/venv/bin/python -c "
import sys
sys.path.insert(0, '/opt/smart-sites')
from app import app, db
with app.app_context():
    db.create_all()
    print('Database initialized successfully')
"

# Configure systemd service
log_info "Configuring Smart Sites systemd service..."
sudo tee /etc/systemd/system/smart-sites.service > /dev/null <<EOF
[Unit]
Description=Smart Sites Construction Site Management
After=network.target redis.service

[Service]
Type=exec
User=smartsites
Group=smartsites
WorkingDirectory=/opt/smart-sites
Environment=PATH=/opt/smart-sites/venv/bin
Environment=FLASK_ENV=production
Environment=DATABASE_URL=sqlite:////opt/smart-sites/data/smart_sites.db
Environment=SECRET_KEY=smart-sites-$(openssl rand -hex 16)
ExecStart=/opt/smart-sites/venv/bin/gunicorn --bind 127.0.0.1:5000 --workers 2 --timeout 300 app:app
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Configure nginx
log_info "Configuring nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/smart-sites > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    client_max_body_size 50M;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location /static {
        alias /opt/smart-sites/frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # ESPHome dashboard (if needed)
    location /esphome {
        proxy_pass http://127.0.0.1:6052;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/smart-sites /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Configure firewall
log_info "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 5000/tcp  # For development access
sudo ufw allow 6052/tcp  # For ESPHome dashboard
sudo ufw reload

# Configure fail2ban
log_info "Configuring fail2ban for SSH protection..."
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s
EOF

# Create backup script
log_info "Setting up backup system..."
sudo tee /opt/smart-sites/scripts/backup.sh > /dev/null <<'EOF'
#!/bin/bash
BACKUP_DIR="/opt/smart-sites/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/smart_sites_backup_$DATE.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Stop Smart Sites for consistent backup
sudo systemctl stop smart-sites

# Create backup
tar -czf $BACKUP_FILE -C /opt/smart-sites \
    --exclude='venv' \
    --exclude='backups' \
    --exclude='logs/*.log' \
    data/ config/ frontend/ *.py requirements.txt

# Restart Smart Sites
sudo systemctl start smart-sites

# Keep only last 7 backups
cd $BACKUP_DIR
ls -t smart_sites_backup_*.tar.gz | tail -n +8 | xargs -r rm

echo "Backup created: $BACKUP_FILE"

# Log backup status
logger "Smart Sites backup completed: $BACKUP_FILE"
EOF

sudo chmod +x /opt/smart-sites/scripts/backup.sh
sudo chown smartsites:smartsites /opt/smart-sites/scripts/backup.sh

# Create log rotation configuration
log_info "Setting up log rotation..."
sudo tee /etc/logrotate.d/smart-sites > /dev/null <<EOF
/opt/smart-sites/logs/*.log {
    weekly
    missingok
    rotate 4
    compress
    delaycompress
    notifempty
    create 644 smartsites smartsites
    postrotate
        systemctl reload smart-sites
    endscript
}
EOF

# Configure automatic security updates
log_info "Configuring automatic security updates..."
sudo tee /etc/apt/apt.conf.d/50unattended-upgrades > /dev/null <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

echo 'APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades

# Set up daily backup cron job
log_info "Setting up automated backups..."
(sudo -u smartsites crontab -l 2>/dev/null; echo "0 2 * * * /opt/smart-sites/scripts/backup.sh") | sudo -u smartsites crontab -

# Create health check script
log_info "Creating system health check..."
sudo tee /opt/smart-sites/scripts/health-check.sh > /dev/null <<'EOF'
#!/bin/bash
# Smart Sites Health Check

# Check if Smart Sites is running
if ! systemctl is-active --quiet smart-sites; then
    echo "WARNING: Smart Sites service is not running"
    sudo systemctl restart smart-sites
    logger "Smart Sites service was restarted by health check"
fi

# Check disk space (warn if >80% full)
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "WARNING: Disk usage is ${DISK_USAGE}%"
    logger "Smart Sites health check: High disk usage ${DISK_USAGE}%"
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ $MEM_USAGE -gt 90 ]; then
    echo "WARNING: Memory usage is ${MEM_USAGE}%"
    logger "Smart Sites health check: High memory usage ${MEM_USAGE}%"
fi

# Check CPU temperature (Pi specific)
if command -v vcgencmd &> /dev/null; then
    TEMP=$(vcgencmd measure_temp | cut -d= -f2 | cut -d\' -f1)
    if (( $(echo "$TEMP > 70" | bc -l) )); then
        echo "WARNING: CPU temperature is ${TEMP}°C"
        logger "Smart Sites health check: High CPU temperature ${TEMP}°C"
    fi
fi
EOF

sudo chmod +x /opt/smart-sites/scripts/health-check.sh
sudo chown smartsites:smartsites /opt/smart-sites/scripts/health-check.sh

# Add health check to cron (every 15 minutes)
(sudo -u smartsites crontab -l 2>/dev/null; echo "*/15 * * * * /opt/smart-sites/scripts/health-check.sh >/dev/null 2>&1") | sudo -u smartsites crontab -

# Enable and start services
log_info "Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable smart-sites
sudo systemctl enable nginx
sudo systemctl enable redis-server
sudo systemctl enable fail2ban

sudo systemctl start redis-server
sudo systemctl start smart-sites
sudo systemctl restart nginx
sudo systemctl start fail2ban

# Wait for services to start
sleep 5

# Check service status
log_info "Checking service status..."
if systemctl is-active --quiet smart-sites; then
    log_success "Smart Sites service is running"
else
    log_error "Smart Sites service failed to start"
    sudo journalctl -u smart-sites --no-pager -n 20
fi

if systemctl is-active --quiet nginx; then
    log_success "Nginx service is running"
else
    log_error "Nginx service failed to start"
fi

if systemctl is-active --quiet redis-server; then
    log_success "Redis service is running"
else
    log_error "Redis service failed to start"
fi

# Get Raspberry Pi IP address
PI_IP=$(hostname -I | awk '{print $1}')

# Final output
echo ""
log_success "Smart Sites installation completed successfully!"
echo ""
echo "🌐 Access Smart Sites at: http://$PI_IP"
echo "👤 Default login: admin / admin123"
echo "📁 Application directory: /opt/smart-sites"
echo "📊 Logs: /opt/smart-sites/logs/"
echo "💾 Backups: /opt/smart-sites/backups/"
echo ""
echo "🔧 Useful commands:"
echo "   sudo systemctl status smart-sites    # Check service status"
echo "   sudo systemctl restart smart-sites   # Restart service"
echo "   sudo journalctl -u smart-sites -f    # View logs"
echo "   /opt/smart-sites/scripts/backup.sh   # Manual backup"
echo "   /opt/smart-sites/scripts/health-check.sh # System health"
echo ""
echo "⚡ Performance optimizations installed:"
echo "   • log2ram (reduces SD card writes)"
echo "   • Automated backups (daily at 2 AM)"
echo "   • Health monitoring (every 15 minutes)"
echo "   • Security hardening (firewall, fail2ban)"
echo "   • Automatic security updates"
echo ""
echo "⚠️  Remember to:"
echo "   1. Change the default admin password"
echo "   2. Configure your network settings"
echo "   3. Test ESPHome device creation"
echo "   4. Set up SSL certificates for production use"
echo ""
echo "🎉 Your construction site management system is ready!"

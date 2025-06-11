#!/bin/bash
BACKUP_DIR="/opt/smart-sites/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/smart_sites_backup_$DATE.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
tar -czf $BACKUP_FILE -C /opt/smart-sites data/ config/

# Keep only last 7 backups
cd $BACKUP_DIR
ls -t smart_sites_backup_*.tar.gz | tail -n +8 | xargs -r rm

echo "Backup created: $BACKUP_FILE"

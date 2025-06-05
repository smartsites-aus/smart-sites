// scripts/export-to-csv.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// === Config ===
const dbPath = path.join(__dirname, '../backend/smart-sites.db');
const exportDir = path.join(__dirname, '../exports');

// Input variables
const siteId = 'site1';             // Change this as needed
const sensorType = 'power';         // e.g., power, toilet-level
const daysBack = 7;                 // Last 7 days

// === Ensure export directory exists ===
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir);
}

// === Connect to DB ===
const db = new sqlite3.Database(dbPath);

// === Calculate date range ===
const now = new Date();
const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

const nowISO = now.toISOString();
const pastISO = past.toISOString();

const query = `
  SELECT timestamp, site_id, sensor_type, value
  FROM readings
  WHERE site_id = ? AND sensor_type = ?
    AND timestamp BETWEEN ? AND ?
  ORDER BY timestamp ASC
`;

db.all(query, [siteId, sensorType, pastISO, nowISO], (err, rows) => {
  if (err) {
    console.error('❌ Error querying database:', err.message);
    return;
  }

  if (rows.length === 0) {
    console.log('⚠️ No data found for that period.');
    return;
  }

  // === Format CSV ===
  const filename = `${siteId}_${sensorType}_weekly_${nowISO.slice(0, 10)}.csv`;
  const filePath = path.join(exportDir, filename);

  const header = 'timestamp,site_id,sensor_type,value\n';
  const csvData = rows.map(row =>
    `${row.timestamp},${row.site_id},${row.sensor_type},${row.value}`
  ).join('\n');

    fs.writeFileSync(filePath, header + csvData);
  console.log(`✅ Exported ${rows.length} rows to ${filePath}`);

  // Close the database
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    } else {
      console.log('🔒 Database connection closed.');
    }
  });
});

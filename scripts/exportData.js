// scripts/exportData.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '../backend/smart-sites.db');
const exportDir = path.join(__dirname, '../exports');

// Ensure export directory exists
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir);
}

/**
 * Export CSV from the database
 * @param {string} siteId - Site ID
 * @param {string[]} sensorTypes - Array of sensor types
 * @param {string} start - ISO timestamp
 * @param {string} end - ISO timestamp
 * @returns {Promise<string>} - Path to generated CSV file
 */
module.exports = function exportToCSV(siteId, sensorTypes, start, end) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);

    const placeholders = sensorTypes.map(() => '?').join(', ');
    const query = `
      SELECT timestamp, site_id, sensor_type, value
      FROM readings
      WHERE site_id = ?
        AND sensor_type IN (${placeholders})
        AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `;

    const params = [siteId, ...sensorTypes, start, end];

    db.all(query, params, (err, rows) => {
      if (err) {
        db.close();
        return reject(err);
      }

      if (rows.length === 0) {
        db.close();
        return reject(new Error('No data found for the selected period.'));
      }

      const header = 'timestamp,site_id,sensor_type,value\n';
      const csvData = rows.map(row =>
        `${row.timestamp},${row.site_id},${row.sensor_type},${row.value}`
      ).join('\n');

      const filename = `${siteId}_${uuidv4()}.csv`;
      const filePath = path.join(exportDir, filename);

      fs.writeFileSync(filePath, header + csvData);
      db.close();

      resolve(filePath);
    });
  });
};
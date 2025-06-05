// backend/server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { sendZWaveCommand } = require('./zwaveControl');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Connect to SQLite database
const dbPath = path.join(__dirname, 'smart-sites.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to database:', err.message);
  } else {
    console.log('✅ Connected to smart-sites.db');
  }
});

// ========== Routes ==========

// Test route
app.get('/', (req, res) => {
  res.send('Smart Sites API is running.');
});

// Get distinct sites
app.get('/sites', (req, res) => {
  const query = `SELECT DISTINCT site_id FROM readings`;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.site_id));
  });
});

// Get sensor types by site
app.get('/sensors/by-site', (req, res) => {
  const { site } = req.query;
  const query = `
    SELECT DISTINCT sensor_type FROM readings
    WHERE site_id = ?
  `;
  db.all(query, [site], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.sensor_type));
  });
});

// Get list of configured sensors
app.get('/sensors', (req, res) => {
  const query = `SELECT * FROM sensors ORDER BY site_id`;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get latest reading for a specific sensor
app.get('/api/readings/latest', (req, res) => {
  const { site, sensor } = req.query;
  if (!site || !sensor) {
    return res.status(400).send('Missing site or sensor');
  }

  const query = `
    SELECT * FROM readings
    WHERE site_id = ? AND sensor_type = ?
    ORDER BY timestamp DESC
    LIMIT 1
  `;
  db.get(query, [site, sensor], (err, row) => {
    if (err) {
      console.error('❌ Latest reading error:', err.message);
      return res.status(500).send('Failed to get reading');
    }
    res.json(row || {});
  });
});

// Export readings to CSV (API version)
app.post('/api/export', (req, res) => {
  const { siteId, sensorType, daysBack } = req.body;
  if (!siteId || !sensorType || !daysBack) {
    return res.status(400).send('Missing parameters');
  }

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
      return res.status(500).send('Failed to query database');
    }

    if (rows.length === 0) {
      return res.status(404).send('No data found');
    }

    const header = 'timestamp,site_id,sensor_type,value\n';
    const csv = header + rows.map(r =>
      `${r.timestamp},${r.site_id},${r.sensor_type},${r.value}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${siteId}_${sensorType}_${nowISO.slice(0, 10)}.csv`
    );
    res.send(csv);
  });
});

// Z-Wave control endpoint
app.post('/api/zwave/control', async (req, res) => {
  try {
    await sendZWaveCommand(req.body);
    res.json({ message: 'Command sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send command' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
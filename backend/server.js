const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const mqtt = require('mqtt');
const { sendZWaveCommand } = require('../scripts/sendZWaveCommand');
const config = require('../config/config.json');

const app = express();
const port = config.backendPort || 4000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./config/smart-sites.db', (err) => {
  if (err) {
    console.error('Failed to connect to database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

app.get('/devices', (req, res) => {
  db.all('SELECT * FROM devices', [], (err, rows) => {
    if (err) {
      res.status(500).send({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post('/control', (req, res) => {
  const { deviceId, command } = req.body;
  sendZWaveCommand(deviceId, command);
  res.send({ status: 'Command sent' });
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});

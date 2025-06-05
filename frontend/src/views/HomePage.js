// frontend/src/views/Homepage.js
import React from 'react';
import { Link } from 'react-router-dom';

const Homepage = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Smart Sites Dashboard</h1>
      <ul>
        <li><Link to="/alerts">View Recent Alerts</Link></li>
        <li><Link to="/sensors">Manage Sensors</Link></li>
        <li><Link to="/zwave">Z-Wave Device Control</Link></li>
        <li><Link to="/export">Export CSV</Link></li>
        <li><Link to="/graph">Graph Sensor Data</Link></li> {/* 👈 NEW */}
      </ul>
    </div>
  );
};

export default Homepage;
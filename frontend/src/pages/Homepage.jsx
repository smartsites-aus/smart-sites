import React from 'react';
import './Homepage.css';

export default function Homepage() {
  return (
    <div className="homepage">
      <h1>Smart Sites Dashboard</h1>

      <div className="cards-container">
        <div className="card temperature">
          <div className="card-title">Temperature</div>
          <div className="card-value">23.5°C</div>
        </div>

        <div className="card humidity">
          <div className="card-title">Humidity</div>
          <div className="card-value">48%</div>
        </div>

        <div className="card pm25">
          <div className="card-title">PM2.5</div>
          <div className="card-value">12 µg/m³</div>
        </div>

        <div className="card noise">
          <div className="card-title">Noise</div>
          <div className="card-value">42 dB</div>
        </div>
      </div>
    </div>
  );
}

export default Homepage;

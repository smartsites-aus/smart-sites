// frontend/src/components/SensorDashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './SensorDashboard.css'; // Optional for styles

const SensorDashboard = () => {
  const [sensors, setSensors] = useState([]);
  const [readings, setReadings] = useState({});

  useEffect(() => {
    // Fetch sensor metadata
    axios.get('/sensors')
      .then(res => {
        setSensors(res.data);
        res.data.forEach(sensor => {
          axios.get('/api/readings/latest', {
            params: { site: sensor.site_id, sensor: sensor.sensor_type }
          })
          .then(r => {
            setReadings(prev => ({
              ...prev,
              [`${sensor.site_id}_${sensor.sensor_type}`]: r.data
            }));
          })
          .catch(err => console.error('Error fetching reading', err));
        });
      })
      .catch(err => console.error('Error fetching sensors', err));
  }, []);

  return (
    <div className="sensor-dashboard">
      {sensors.map(sensor => {
        const key = `${sensor.site_id}_${sensor.sensor_type}`;
        const reading = readings[key];
        return (
          <div key={key} className="sensor-card">
            <h3>{sensor.name || sensor.sensor_type}</h3>
            <p><strong>Site:</strong> {sensor.site_id}</p>
            <p><strong>Latest:</strong> {reading?.value ?? 'N/A'}</p>
            <p><strong>Time:</strong> {reading?.timestamp ?? 'Loading...'}</p>
          </div>
        );
      })}
    </div>
  );
};

export default SensorDashboard;
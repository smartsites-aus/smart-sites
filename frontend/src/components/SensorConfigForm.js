// frontend/src/components/SensorConfigForm.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SensorConfigForm = () => {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [sensorTypes, setSensorTypes] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState('');
  const [minThreshold, setMinThreshold] = useState('');
  const [maxThreshold, setMaxThreshold] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    axios.get('/sensors').then((res) => {
      const uniqueSites = [...new Set(res.data.map((s) => s.site_id))];
      setSites(uniqueSites);
    });
  }, []);

  useEffect(() => {
    if (selectedSite) {
      axios.get(`/sensors?site=${selectedSite}`).then((res) => {
        const uniqueSensors = [...new Set(res.data.map((s) => s.sensor_type))];
        setSensorTypes(uniqueSensors);
      });
    } else {
      setSensorTypes([]);
    }
  }, [selectedSite]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedSite || !selectedSensor || minThreshold === '' || maxThreshold === '') {
      setStatus('⚠️ Please fill in all fields');
      return;
    }

    axios
      .post('/sensor-config', {
        site_id: selectedSite,
        sensor_type: selectedSensor,
        min_threshold: parseFloat(minThreshold),
        max_threshold: parseFloat(maxThreshold),
      })
      .then(() => {
        setStatus('✅ Configuration saved!');
      })
      .catch(() => {
        setStatus('❌ Failed to save configuration.');
      });
  };

  return (
    <div>
      <h2>⚙️ Sensor Alert Configuration</h2>
      <form onSubmit={handleSubmit}>
        <label>Site:</label>
        <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)}>
          <option value="">-- Select Site --</option>
          {sites.map((site) => (
            <option key={site} value={site}>
              {site}
            </option>
          ))}
        </select>

        <label>Sensor:</label>
        <select value={selectedSensor} onChange={(e) => setSelectedSensor(e.target.value)}>
          <option value="">-- Select Sensor --</option>
          {sensorTypes.map((sensor) => (
            <option key={sensor} value={sensor}>
              {sensor}
            </option>
          ))}
        </select>

        <label>Min Threshold:</label>
        <input
          type="number"
          value={minThreshold}
          onChange={(e) => setMinThreshold(e.target.value)}
        />

        <label>Max Threshold:</label>
        <input
          type="number"
          value={maxThreshold}
          onChange={(e) => setMaxThreshold(e.target.value)}
        />

        <button type="submit">Save Configuration</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
};

export default SensorConfigForm;
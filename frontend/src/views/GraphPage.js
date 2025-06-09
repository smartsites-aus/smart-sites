// frontend/src/views/GraphPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SensorGraph from '../components/SensorGraph';

function GraphPage() {
  const [siteId, setSiteId] = useState('');
  const [sensorType, setSensorType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sensorOptions, setSensorOptions] = useState([]);
  const [graphData, setGraphData] = useState([]);

  // Fetch all available sensors for dropdowns
  useEffect(() => {
    axios.get('/sensors')
      .then(res => {
        setSensorOptions(res.data);
      })
      .catch(err => {
        console.error('Error fetching sensors:', err);
      });
  }, []);

  const handleGenerateGraph = async () => {
    if (!siteId || !sensorType || !startDate || !endDate) {
      alert('Please fill out all fields');
      return;
    }

    try {
      const res = await axios.get('/graph-data', {
        params: { site: siteId, sensor: sensorType, start: startDate, end: endDate }
      });
      setGraphData(res.data);
    } catch (error) {
      console.error('Error fetching graph data:', error);
      alert('Failed to fetch graph data');
    }
  };

  return (
    <div className="container">
      <h2>📈 Graph Sensor Data</h2>

      <div className="form-section">
        <label>Site ID:</label>
        <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">-- Select Site --</option>
          {[...new Set(sensorOptions.map(s => s.site_id))].map(site => (
            <option key={site} value={site}>{site}</option>
          ))}
        </select>
      </div>

      <div className="form-section">
        <label>Sensor Type:</label>
        <select value={sensorType} onChange={(e) => setSensorType(e.target.value)}>
          <option value="">-- Select Sensor --</option>
          {[...new Set(sensorOptions.map(s => s.sensor_type))].map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="form-section">
        <label>Start Date:</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>

      <div className="form-section">
        <label>End Date:</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      <button onClick={handleGenerateGraph}>Generate Graph</button>

      <div style={{ marginTop: '40px' }}>
        {graphData.length > 0 ? (
          <SensorGraph data={graphData} />
        ) : (
          <p>No data loaded yet</p>
        )}
      </div>
    </div>
  );
}

export default GraphPage;
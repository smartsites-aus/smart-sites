// frontend/src/views/GraphPage.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SensorGraph from '../components/SensorGraph';

const GraphPage = () => {
  const [siteId, setSiteId] = useState('');
  const [sensorType, setSensorType] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [data, setData] = useState([]);
  const [availableSensors, setAvailableSensors] = useState([]);

  useEffect(() => {
    axios.get('/api/sensors')
      .then((res) => setAvailableSensors(res.data))
      .catch((err) => console.error(err));
  }, []);

  const handleFetch = async () => {
    if (!siteId || !sensorType || !start || !end) return;
    try {
      const res = await axios.get('/api/readings', {
        params: { site: siteId, sensor: sensorType, start, end }
      });
      setData(res.data);
    } catch (err) {
      console.error('❌ Error fetching data:', err);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Graph Sensor Data</h2>

      <div style={{ marginBottom: '1rem' }}>
        <label>Site ID:</label>
        <input value={siteId} onChange={e => setSiteId(e.target.value)} />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>Sensor Type:</label>
        <select value={sensorType} onChange={e => setSensorType(e.target.value)}>
          <option value="">-- Select Sensor --</option>
          {availableSensors.map((s, idx) => (
            <option key={idx} value={s.sensor_type}>{s.sensor_type}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>Start Date/Time:</label>
        <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>End Date/Time:</label>
        <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} />
      </div>

      <button onClick={handleFetch}>Fetch and Graph</button>

      {data.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <SensorGraph dataPoints={data} />
        </div>
      )}
    </div>
  );
};

export default GraphPage;
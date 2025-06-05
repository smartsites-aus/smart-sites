// frontend/src/components/CSVExportForm.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const CSVExportForm = () => {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [sensorTypes, setSensorTypes] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloadLink, setDownloadLink] = useState('');

  useEffect(() => {
    // Load all sensors and extract unique site IDs
    axios.get('/sensors').then((res) => {
      const data = res.data;
      const uniqueSites = [...new Set(data.map((s) => s.site_id))];
      setSites(uniqueSites);
    });
  }, []);

  useEffect(() => {
    if (selectedSite) {
      axios.get(`/sensors?site=${selectedSite}`).then((res) => {
        const sensors = res.data.map((s) => s.sensor_type);
        setSensorTypes([...new Set(sensors)]);
      });
    } else {
      setSensorTypes([]);
      setSelectedSensor('');
    }
  }, [selectedSite]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedSite || !selectedSensor || !startDate || !endDate) {
      alert('Please fill in all fields');
      return;
    }

    const url = `/export?site=${selectedSite}&sensor=${selectedSensor}&start=${startDate}&end=${endDate}`;
    setDownloadLink(url);
  };

  return (
    <div>
      <h2>📁 Export CSV</h2>
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

        <label>Start Date:</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />

        <label>End Date:</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

        <button type="submit">Generate CSV</button>
      </form>

      {downloadLink && (
        <p>
          ✅ CSV ready: <a href={downloadLink}>Download CSV</a>
        </p>
      )}
    </div>
  );
};

export default CSVExportForm;
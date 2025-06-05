// frontend/src/views/DashboardPage.js
import React, { useEffect, useState } from 'react';

const DashboardPage = () => {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReadings = async () => {
      try {
        const response = await fetch('/api/readings/latest');
        const data = await response.json();
        setReadings(data);
      } catch (error) {
        console.error('Error fetching readings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReadings();
  }, []);

  return (
    <div>
      <h2>Dashboard</h2>
      {loading ? (
        <p>Loading readings...</p>
      ) : (
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Site ID</th>
              <th>Sensor Type</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r) => (
              <tr key={r.id}>
                <td>{r.timestamp}</td>
                <td>{r.site_id}</td>
                <td>{r.sensor_type}</td>
                <td>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DashboardPage;
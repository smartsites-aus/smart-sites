// frontend/src/components/SensorAlertPanel.js
import React, { useEffect, useState } from 'react';

const SensorAlertPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(null);

  useEffect(() => {
    fetchAlerts(); // Initial fetch
    const interval = setInterval(fetchAlerts, 5000); // Poll every 5 seconds
    setPollingInterval(interval);

    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/alerts');
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Live Alerts</h2>
      {loading ? (
        <p>Loading...</p>
      ) : alerts.length === 0 ? (
        <p>No active alerts</p>
      ) : (
        <ul>
          {alerts.map((alert) => (
            <li key={alert.id}>
              <strong>{alert.timestamp}:</strong> [{alert.site_id} / {alert.sensor_type}] - {alert.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SensorAlertPanel;
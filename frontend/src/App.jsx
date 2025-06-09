import React, { useEffect, useState } from 'react';

function App() {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    fetch('http://localhost:4000/devices')
      .then((res) => res.json())
      .then(setDevices)
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Smart Sites Dashboard</h1>
      <ul>
        {devices.map((device) => (
          <li key={device.id}>{device.name} - {device.status}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;

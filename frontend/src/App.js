// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Homepage from './views/Homepage';
import SensorConfigPage from './views/SensorConfigPage';
import CSVExportPage from './views/CSVExportPage';
import ZWaveControlPage from './views/ZWaveControlPage';
import GraphPage from './views/GraphPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/sensor-config" element={<SensorConfigPage />} />
        <Route path="/export" element={<CSVExportPage />} />
        <Route path="/zwave-control" element={<ZWaveControlPage />} />
        <Route path="/graphing" element={<GraphPage />} />
      </Routes>
    </Router>
  );
}

export default App;
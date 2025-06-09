// frontend/src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Homepage from './pages/Homepage';
import CSVExportForm from './components/CSVExportForm';
import ZWaveControlForm from './components/ZWaveControlForm';
import SensorGraph from './components/SensorGraph';
import './App.css';

function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`app-container ${isCollapsed ? 'collapsed' : ''}`}>
      <Router>
        <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/export" element={<CSVExportForm />} />
            <Route path="/zwave" element={<ZWaveControlForm />} />
            <Route path="/graph" element={<SensorGraph />} />
          </Routes>
        </div>
      </Router>
    </div>
  );
}

export default App;
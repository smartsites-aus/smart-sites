// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Homepage from './pages/Homepage';
import ESPHomePage from './pages/ESPHomePage';

function App() {
  return (
    <Router>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 p-4 overflow-auto">
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/esphome" element={<ESPHomePage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

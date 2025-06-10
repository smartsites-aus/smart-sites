// src/components/Sidebar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function Sidebar() {
  return (
    <div className="w-64 bg-gray-800 text-white p-4">
      <h2 className="text-xl font-bold mb-4">Smart Sites</h2>
      <nav className="flex flex-col gap-2">
        <Link to="/" className="hover:bg-gray-700 p-2 rounded">Dashboard</Link>
        <Link to="/esphome" className="hover:bg-gray-700 p-2 rounded">ESPHome</Link>
      </nav>
    </div>
  );
}

export default Sidebar;

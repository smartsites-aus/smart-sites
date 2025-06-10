import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Sidebar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <div className="w-64 bg-gray-800 text-white p-4 flex-shrink-0">
      <h2 className="text-2xl font-bold mb-6">Smart Sites</h2>
      <nav className="flex flex-col gap-4">
        <Link
          to="/"
          className={`hover:text-blue-400 ${isActive('/') ? 'text-blue-400' : ''}`}
        >
          Dashboard
        </Link>
        <Link
          to="/esphome"
          className={`hover:text-blue-400 ${isActive('/esphome') ? 'text-blue-400' : ''}`}
        >
          ESPHome
        </Link>
      </nav>
    </div>
  );
}

export default Sidebar;

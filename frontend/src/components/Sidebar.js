// frontend/src/components/Sidebar.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaHome,
  FaFileCsv,
  FaProjectDiagram,
  FaChartLine,
  FaAngleLeft,
  FaAngleRight
} from 'react-icons/fa';
import './Sidebar.css';

function Sidebar({ isCollapsed, onToggle }) {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Home', icon: <FaHome /> },
    { path: '/export', label: 'Export CSV', icon: <FaFileCsv /> },
    { path: '/zwave', label: 'Z-Wave Control', icon: <FaProjectDiagram /> },
    { path: '/graph', label: 'Graph', icon: <FaChartLine /> },
  ];

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-toggle" onClick={onToggle}>
        {isCollapsed ? <FaAngleRight /> : <FaAngleLeft />}
      </div>
      <ul className="sidebar-menu">
        {menuItems.map((item) => (
          <li
            key={item.path}
            className={location.pathname === item.path ? 'active' : ''}
          >
            <Link to={item.path}>
              <span className="icon">{item.icon}</span>
              {!isCollapsed && <span className="label">{item.label}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Sidebar;
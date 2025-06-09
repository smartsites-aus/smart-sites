// frontend/src/utils/iconUtils.js

import { FaBolt, FaThermometerHalf, FaWater, FaToilet, FaChartBar } from 'react-icons/fa';

export const getIconForSensor = (type) => {
  switch (type) {
    case 'power':
      return <FaBolt />;
    case 'temperature':
    case 'temp':
      return <FaThermometerHalf />;
    case 'water-level':
      return <FaWater />;
    case 'toilet-level':
      return <FaToilet />;
    default:
      return <FaChartBar />;
  }
};
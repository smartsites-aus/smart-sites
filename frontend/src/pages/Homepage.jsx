/* frontend/src/pages/Homepage.css */

import './Homepage.css';

.homepage {
  padding: 2rem;
  font-family: "Segoe UI", Roboto, sans-serif;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.title {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #333;
  text-align: center;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  align-items: stretch;
  justify-content: center;
}

.loading {
  text-align: center;
  font-size: 1.2rem;
  padding: 2rem;
}

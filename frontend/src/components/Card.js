/* frontend/src/components/Card.css */

.mushroom-card {
  background: #ffffff;
  border-radius: 1rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.15s ease;
}

.mushroom-card:hover {
  transform: translateY(-4px);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.card-icon {
  font-size: 2rem;
  color: #007bff;
  margin-right: 1rem;
}

.card-title h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: #222;
}

.card-title p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sensor-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111;
}

.timestamp {
  font-size: 0.8rem;
  color: #888;
}
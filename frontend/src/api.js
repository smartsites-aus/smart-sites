// frontend/src/api.js
const API_BASE = 'http://localhost:3000'; // Adjust if running backend remotely

export async function fetchSites() {
  const res = await fetch(`${API_BASE}/sensors`);
  return await res.json();
}

export async function fetchAlerts(siteId, sensorType) {
  const url = new URL(`${API_BASE}/alerts`);
  if (siteId) url.searchParams.append('site', siteId);
  if (sensorType) url.searchParams.append('sensor', sensorType);
  const res = await fetch(url.toString());
  return await res.json();
}

export async function exportCSV(params) {
  const url = new URL(`${API_BASE}/export`);
  Object.entries(params).forEach(([key, val]) => url.searchParams.append(key, val));
  return fetch(url.toString());
}

export async function sendZWaveCommand(command) {
  const res = await fetch(`${API_BASE}/api/zwave/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  return res.json();
}
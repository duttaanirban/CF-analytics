const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

async function request(path, signal) {
  const response = await fetch(`${API_URL}${path}`, { signal });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Unable to load analytics");
  }

  return data;
}

export function fetchSessions(signal) {
  return request("/sessions", signal);
}

export function fetchSessionEvents(sessionId, signal) {
  return request(
    `/sessions/${encodeURIComponent(sessionId)}/events`,
    signal
  );
}

export function fetchHeatmap(pageUrl, signal) {
  return request(
    `/heatmap?pageUrl=${encodeURIComponent(pageUrl)}`,
    signal
  );
}

export function fetchPages(signal) {
  return request("/pages", signal);
}
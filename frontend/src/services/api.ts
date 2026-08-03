const API_BASE = "/api";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return await res.json();
}

export async function fetchDatabaseStats() {
  const res = await fetch(`${API_BASE}/db/stats`);
  return await res.json();
}

export async function initDatabaseTables() {
  const res = await fetch(`${API_BASE}/db/init`, { method: "POST" });
  return await res.json();
}

export async function seedDatabase() {
  const res = await fetch(`${API_BASE}/db/seed`, { method: "POST" });
  return await res.json();
}

export async function uploadJsonFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/upload/json`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Upload failed");
  }
  return await res.json();
}

export async function fetchIdentitySummary() {
  const res = await fetch(`${API_BASE}/identity/summary`);
  return await res.json();
}

export async function fetchEvents(params: { limit?: number; provider?: string; identity_user?: string; min_risk?: number }) {
  const query = new URLSearchParams();
  if (params.limit) query.append("limit", params.limit.toString());
  if (params.provider) query.append("provider", params.provider);
  if (params.identity_user) query.append("identity_user", params.identity_user);
  if (params.min_risk) query.append("min_risk", params.min_risk.toString());

  const res = await fetch(`${API_BASE}/identity/events?${query.toString()}`);
  return await res.json();
}

export async function fetchProfiles(limit = 50) {
  const res = await fetch(`${API_BASE}/identity/profiles?limit=${limit}`);
  return await res.json();
}

export async function fetchAlerts(severity?: string, status?: string) {
  const query = new URLSearchParams();
  if (severity) query.append("severity", severity);
  if (status) query.append("status", status);
  const res = await fetch(`${API_BASE}/identity/alerts?${query.toString()}`);
  return await res.json();
}

export async function triageAlert(alertId: string, newStatus: string, action?: string) {
  const query = new URLSearchParams({ new_status: newStatus });
  if (action) query.append("action", action);
  const res = await fetch(`${API_BASE}/identity/alerts/${alertId}/triage?${query.toString()}`, { method: "POST" });
  return await res.json();
}

export async function executePlaybook(alertId: string, actionType: string, targetIdentity: string) {
  const query = new URLSearchParams({ action_type: actionType, target_identity: targetIdentity });
  const res = await fetch(`${API_BASE}/identity/alerts/${alertId}/playbook?${query.toString()}`, { method: "POST" });
  return await res.json();
}

export async function fetchGraphTopology() {
  const res = await fetch(`${API_BASE}/graph/topology`);
  return await res.json();
}

export async function fetchBlastRadius(identityUser: string) {
  const res = await fetch(`${API_BASE}/graph/blast-radius?identity_user=${encodeURIComponent(identityUser)}`);
  return await res.json();
}

export async function fetchFeeds() {
  const res = await fetch(`${API_BASE}/identity/feeds`);
  return await res.json();
}

export async function toggleFeed(feedId: string, enabled: boolean) {
  const res = await fetch(`${API_BASE}/identity/feeds/${feedId}/toggle?enabled=${enabled}`, { method: "POST" });
  return await res.json();
}

export async function fetchBulletins() {
  const res = await fetch(`${API_BASE}/identity/bulletins`);
  return await res.json();
}

export async function injectAttackSimulation(scenario: string) {
  const res = await fetch(`${API_BASE}/identity/simulator/inject?scenario=${scenario}`, { method: "POST" });
  return await res.json();
}

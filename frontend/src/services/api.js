const API_BASE = "/api";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return await res.json();
}

export async function fetchThreatExposureReport() {
  const res = await fetch(`${API_BASE}/reports/threat-exposure`);
  return await res.json();
}

export async function fetchThreatScenariosReport() {
  const res = await fetch(`${API_BASE}/reports/threat-scenarios`);
  return await res.json();
}

export async function fetchIdentityResilienceReport(sourceMode = 'subsystems') {
  const res = await fetch(`${API_BASE}/reports/identity-resilience?source_mode=${encodeURIComponent(sourceMode)}`);
  return await res.json();
}

export async function calculateRuleEngineBlastRadius(entryEntity = "USER_JDOE") {
  const res = await fetch(`${API_BASE}/blast-radius/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entry_entity: entryEntity })
  });
  return await res.json();
}

export async function calculateBulletinBlastRadius(bulletinId = "TB-2026-LIVE") {
  const res = await fetch(`${API_BASE}/blast-radius/calculate-bulletin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bulletin_id: bulletinId })
  });
  return await res.json();
}

export async function triggerBlastRadiusMigration() {
  const res = await fetch(`${API_BASE}/blast-radius/migrate`, { method: "POST" });
  return await res.json();
}

export async function fetchThreatSamples() {
  const res = await fetch(`${API_BASE}/threat-samples`);
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

export async function uploadJsonFile(file, targetTable) {
  const formData = new FormData();
  formData.append("file", file);
  const query = targetTable ? `?target_table=${encodeURIComponent(targetTable)}` : '';
  const res = await fetch(`${API_BASE}/upload/json${query}`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Upload failed");
  }
  return await res.json();
}

export async function analyzeThreatText(bulletinText, analysisPath = "standard") {
  const res = await fetch(`${API_BASE}/threats/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bulletin_text: bulletinText,
      analysis_path: analysisPath
    })
  });
  return await res.json();
}

export async function ingestFormattedLlmJson(formattedJson, analysisPath = "standard") {
  const res = await fetch(`${API_BASE}/ingest/threat-bulletin-json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bulletin_json: formattedJson,
      analysis_path: analysisPath
    })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Direct LLM JSON Ingestion failed");
  }
  return await res.json();
}

export async function pullRssItems(url, name) {
  const res = await fetch(`${API_BASE}/rss/pull?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`);
  return await res.json();
}

export async function analyzeRssItems(items) {
  const res = await fetch(`${API_BASE}/rss/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(items)
  });
  return await res.json();
}

export async function fetchIdentitySummary() {
  const res = await fetch(`${API_BASE}/identity/summary`);
  return await res.json();
}

export async function fetchEvents(params = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.append("limit", params.limit.toString());
  if (params.provider) query.append("provider", params.provider);
  if (params.identity_user) query.append("identity_user", params.identity_user);
  if (params.min_risk !== undefined) query.append("min_risk", params.min_risk.toString());

  const res = await fetch(`${API_BASE}/identity/events?${query.toString()}`);
  return await res.json();
}

export async function fetchProfiles(limit = 50) {
  const res = await fetch(`${API_BASE}/identity/profiles?limit=${limit}`);
  return await res.json();
}

export async function fetchAlerts(severity, status) {
  const query = new URLSearchParams();
  if (severity) query.append("severity", severity);
  if (status) query.append("status", status);
  const res = await fetch(`${API_BASE}/identity/alerts?${query.toString()}`);
  return await res.json();
}

export async function triageAlert(alertId, newStatus, action) {
  const query = new URLSearchParams({ new_status: newStatus });
  if (action) query.append("action", action);
  const res = await fetch(`${API_BASE}/identity/alerts/${alertId}/triage?${query.toString()}`, { method: "POST" });
  return await res.json();
}

export async function executePlaybook(alertId, actionType, targetIdentity) {
  const query = new URLSearchParams({ action_type: actionType, target_identity: targetIdentity });
  const res = await fetch(`${API_BASE}/identity/alerts/${alertId}/playbook?${query.toString()}`, { method: "POST" });
  return await res.json();
}

export async function fetchGraphTopology() {
  const res = await fetch(`${API_BASE}/graph/topology`);
  return await res.json();
}

export async function fetchBlastRadius(identityUser, bulletinId) {
  const query = new URLSearchParams({ identity_user: identityUser });
  if (bulletinId) query.append("bulletin_id", bulletinId);
  const res = await fetch(`${API_BASE}/graph/blast-radius?${query.toString()}`);
  return await res.json();
}

export async function fetchTableData(tableName, limit = 50) {
  const res = await fetch(`${API_BASE}/db/table-data?table_name=${encodeURIComponent(tableName)}&limit=${limit}`);
  return await res.json();
}

export async function fetchFeeds() {
  const res = await fetch(`${API_BASE}/identity/feeds`);
  return await res.json();
}

export async function toggleFeed(feedId, enabled) {
  const res = await fetch(`${API_BASE}/identity/feeds/${feedId}/toggle?enabled=${enabled}`, { method: "POST" });
  return await res.json();
}

export async function fetchBulletins() {
  const res = await fetch(`${API_BASE}/identity/bulletins`);
  return await res.json();
}

export async function injectAttackSimulation(scenario) {
  const res = await fetch(`${API_BASE}/identity/simulator/inject?scenario=${scenario}`, { method: "POST" });
  return await res.json();
}

export async function reanalyzeThreats() {
  const res = await fetch(`${API_BASE}/threats/reanalyze`, { method: "POST" });
  return await res.json();
}

export async function reanalyzeSingleThreat(bulletinId) {
  const res = await fetch(`${API_BASE}/threats/${encodeURIComponent(bulletinId)}/reanalyze`, { method: "POST" });
  return await res.json();
}

export async function fetchThreatDetails(bulletinId) {
  const res = await fetch(`${API_BASE}/threats/${encodeURIComponent(bulletinId)}`);
  return await res.json();
}

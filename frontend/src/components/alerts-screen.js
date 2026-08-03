import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { fetchAlerts, triageAlert, executePlaybook } from '../services/api.js';

export class AlertsScreen extends LitElement {
  static properties = {
    alerts: { type: Array },
    selectedSeverity: { type: String },
    toastMsg: { type: String }
  };

  static styles = css`
    :host { display: block; color: var(--text-primary); }

    /* ── PAGE HEADER ── */
    .header { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 16px; }
    .title { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; }
    .subtitle { font-size: 11.5px; color: var(--text-muted); margin: 2px 0 0 0; }

    /* ── KPI ROW – 4 cards with colour-coded left border ── */
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .kpi-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      cursor: pointer;
      transition: box-shadow 0.2s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .kpi-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
    .kpi-card.active { box-shadow: inset 0 0 0 1px var(--border-accent); }
    .kpi-lbl { font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; display: block; }
    .kpi-num { display: block; font-size: 20px; font-weight: 700; margin: 4px 0 0 0; }

    /* ── CARD WRAPPER ── */
    .card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

    /* ── TABLE ── */
    .table-wrapper { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 10px 12px; color: var(--text-muted); font-size: 11px; text-transform: uppercase; border-bottom: 1px solid var(--border-color); background: var(--bg-sidebar); white-space: nowrap; }
    td { padding: 10px 12px; border-bottom: 1px solid var(--border-color); font-size: 12px; color: var(--text-primary); vertical-align: middle; }
    tr:hover td { background: var(--bg-card-hover); }
    .table-empty { text-align: center; color: var(--text-muted); padding: 20px; }

    /* ── SEVERITY BADGES ── */
    .sev-badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; }
    .sev-critical { background: rgba(239,68,68,0.18); color: var(--color-danger, #ef4444); border: 1px solid var(--color-danger, #ef4444); }
    .sev-high     { background: rgba(245,158,11,0.18); color: orange; border: 1px solid orange; }
    .sev-medium   { background: rgba(245,158,11,0.13); color: var(--color-warning, #f59e0b); border: 1px solid var(--color-warning, #f59e0b); }
    .sev-low      { background: rgba(0,229,255,0.12); color: var(--text-accent); border: 1px solid var(--text-accent); }

    /* ── STATUS BADGE ── */
    .status-open { background: rgba(239,68,68,0.15); color: var(--color-danger, #ef4444); border: 1px solid var(--color-danger, #ef4444); padding: 2px 8px; border-radius: 10px; font-size: 10.5px; font-weight: 700; }
    .status-resolved { background: rgba(16,185,129,0.15); color: var(--color-success, #10b981); border: 1px solid var(--color-success, #10b981); padding: 2px 8px; border-radius: 10px; font-size: 10.5px; font-weight: 700; }

    /* ── ACTION BUTTONS ── */
    .action-btn { padding: 4px 9px; border-radius: 5px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid; transition: all 0.18s ease; white-space: nowrap; display: inline-block; }
    .btn-disable  { background: rgba(239,68,68,0.12); color: var(--color-danger, #ef4444); border-color: var(--color-danger, #ef4444); }
    .btn-disable:hover  { background: var(--color-danger, #ef4444); color: #fff; }
    .btn-revoke   { background: rgba(245,158,11,0.12); color: orange; border-color: orange; }
    .btn-revoke:hover   { background: orange; color: #fff; }
    .btn-resolve  { background: rgba(16,185,129,0.12); color: var(--color-success, #10b981); border-color: var(--color-success, #10b981); }
    .btn-resolve:hover  { background: var(--color-success, #10b981); color: #fff; }

    /* ── TOAST ── */
    .toast { padding: 10px 16px; background: rgba(0,229,255,0.1); border: 1px solid var(--border-accent); color: var(--text-accent); border-radius: 6px; font-weight: 600; font-size: 12px; }
  `;

  constructor() {
    super();
    this.alerts = [];
    this.selectedSeverity = 'ALL';
    this.toastMsg = '';
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadAlerts();
  }

  async loadAlerts() {
    try {
      const sev = this.selectedSeverity === 'ALL' ? undefined : this.selectedSeverity;
      this.alerts = await fetchAlerts(sev) || [];
    } catch (e) {
      console.error('loadAlerts error:', e);
    }
  }

  async handleTriage(alertId, status) {
    try {
      await triageAlert(alertId, status);
      this.toastMsg = `Alert [${alertId}] triaged → ${status.toUpperCase()}`;
      await this.loadAlerts();
    } catch (e) {
      this.toastMsg = 'Triage action failed – see console.';
    }
    setTimeout(() => { this.toastMsg = ''; }, 4000);
  }

  async handlePlaybook(alertId, actionType, identityUser) {
    try {
      const res = await executePlaybook(alertId, actionType, identityUser);
      this.toastMsg = `Playbook [${actionType}] executed for ${identityUser}. Status: ${res.status}`;
      await this.loadAlerts();
    } catch (e) {
      this.toastMsg = `Playbook failed for ${actionType}.`;
    }
    setTimeout(() => { this.toastMsg = ''; }, 4500);
  }

  sevClass(sev) {
    const s = (sev || '').toUpperCase();
    return s === 'CRITICAL' ? 'sev-critical' : s === 'HIGH' ? 'sev-high' : s === 'MEDIUM' ? 'sev-medium' : 'sev-low';
  }

  render() {
    const criticals = this.alerts.filter(a => (a.severity || '').toUpperCase() === 'CRITICAL').length;
    const highs     = this.alerts.filter(a => (a.severity || '').toUpperCase() === 'HIGH').length;
    const mediums   = this.alerts.filter(a => (a.severity || '').toUpperCase() === 'MEDIUM').length;
    const lows      = this.alerts.filter(a => !['CRITICAL','HIGH','MEDIUM'].includes((a.severity || '').toUpperCase())).length;

    return html`
      <!-- HEADER -->
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div class="header">
          <i class="fa-solid fa-bell" style="font-size: 24px; color: var(--text-accent);"></i>
          <div>
            <h2 class="title">Identity Threat Alerts Timeline</h2>
            <p class="subtitle">Correlated security alerts, active rule triggers and automatic playbooks execution outcomes</p>
          </div>
        </div>

        ${this.toastMsg ? html`<div class="toast"><i class="fa-solid fa-circle-check"></i> ${this.toastMsg}</div>` : ''}

        <!-- 4 KPI CARDS WITH COLOUR-CODED BORDER-LEFT -->
        <div class="kpi-row">
          <div class="kpi-card ${this.selectedSeverity === 'CRITICAL' ? 'active' : ''}"
               style="border-left: 4px solid var(--color-danger, #ef4444);"
               @click=${() => { this.selectedSeverity = this.selectedSeverity === 'CRITICAL' ? 'ALL' : 'CRITICAL'; this.loadAlerts(); }}>
            <span class="kpi-lbl">CRITICAL</span>
            <h3 class="kpi-num" style="color: var(--color-danger, #ef4444);">${criticals}</h3>
          </div>
          <div class="kpi-card ${this.selectedSeverity === 'HIGH' ? 'active' : ''}"
               style="border-left: 4px solid orange;"
               @click=${() => { this.selectedSeverity = this.selectedSeverity === 'HIGH' ? 'ALL' : 'HIGH'; this.loadAlerts(); }}>
            <span class="kpi-lbl">HIGH</span>
            <h3 class="kpi-num" style="color: orange;">${highs}</h3>
          </div>
          <div class="kpi-card ${this.selectedSeverity === 'MEDIUM' ? 'active' : ''}"
               style="border-left: 4px solid var(--color-warning, #f59e0b);"
               @click=${() => { this.selectedSeverity = this.selectedSeverity === 'MEDIUM' ? 'ALL' : 'MEDIUM'; this.loadAlerts(); }}>
            <span class="kpi-lbl">MEDIUM</span>
            <h3 class="kpi-num" style="color: var(--color-warning, #f59e0b);">${mediums}</h3>
          </div>
          <div class="kpi-card ${this.selectedSeverity === 'LOW' ? 'active' : ''}"
               style="border-left: 4px solid var(--text-accent);"
               @click=${() => { this.selectedSeverity = this.selectedSeverity === 'LOW' ? 'ALL' : 'LOW'; this.loadAlerts(); }}>
            <span class="kpi-lbl">LOW</span>
            <h3 class="kpi-num" style="color: var(--text-accent);">${lows}</h3>
          </div>
        </div>

        <!-- ALERTS TABLE -->
        <div class="card">
          <h3 style="margin: 0 0 12px 0; font-size: 13.5px; color: var(--text-primary);">
            <i class="fa-solid fa-list" style="color: var(--text-accent);"></i> Triggered Identity Alerts
          </h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style="width: 140px;">Timestamp</th>
                  <th style="width: 80px;">Severity</th>
                  <th>Alert Trigger Type</th>
                  <th>Affected Identity</th>
                  <th>MITRE Technique</th>
                  <th>Automated Action Executed</th>
                  <th style="width: 70px;">Status</th>
                  <th style="width: 120px;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${this.alerts.length === 0 ? html`
                  <tr><td colspan="8" class="table-empty">No alerts triggered yet. Run a threat simulation scenario to fire alerts.</td></tr>
                ` : this.alerts.map(a => html`
                  <tr>
                    <td style="font-size: 11px; color: var(--text-muted);">
                      <div style="font-family: monospace; color: var(--text-accent); font-weight: 700; font-size: 11px;">${a.alert_id}</div>
                      <div style="margin-top: 2px;">${(a.timestamp || '').substring(0, 19).replace('T', ' ')}</div>
                    </td>
                    <td>
                      <span class="sev-badge ${this.sevClass(a.severity)}">${(a.severity || 'LOW').toUpperCase()}</span>
                    </td>
                    <td>
                      <div style="font-weight: 700; color: var(--text-primary);">${a.alert_type || a.alert_trigger_type || 'Unknown Alert'}</div>
                      <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${(a.description || '').substring(0, 80)}</div>
                    </td>
                    <td style="font-weight: 600; color: var(--text-accent);">${a.identity_user}</td>
                    <td style="font-family: monospace; color: var(--text-accent); font-weight: 700;">${a.mitre_technique || 'T1110'}</td>
                    <td style="font-size: 11px; color: var(--text-muted);">
                      ${a.playbook_executed
                        ? html`<span style="color: var(--color-success, #10b981); font-weight: 600;">✅ ${a.playbook_executed}</span>`
                        : html`<span style="color: var(--text-muted);">Awaiting trigger…</span>`}
                    </td>
                    <td>
                      <span class="${a.status === 'open' ? 'status-open' : 'status-resolved'}">
                        ${(a.status || 'open').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        <button class="action-btn btn-disable"
                          @click=${() => this.handlePlaybook(a.alert_id, 'disable_ad_account', a.identity_user)}
                          title="Disable the AD account for this identity">
                          🔒 Disable AD
                        </button>
                        <button class="action-btn btn-revoke"
                          @click=${() => this.handlePlaybook(a.alert_id, 'revoke_cloud_sessions', a.identity_user)}
                          title="Revoke all active cloud sessions">
                          ⚡ Revoke Cloud
                        </button>
                        <button class="action-btn btn-resolve"
                          @click=${() => this.handleTriage(a.alert_id, 'resolved')}
                          title="Mark this alert as resolved">
                          ✓ Resolve
                        </button>
                      </div>
                    </td>
                  </tr>
                `)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('alerts-screen', AlertsScreen);

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { fetchEvents, fetchIdentitySummary } from '../services/api.js';

@customElement('telemetry-screen')
export class TelemetryScreen extends LitElement {
  static styles = css`
    :host {
      display: block;
      color: #f0f4f8;
    }
    .header {
      margin-bottom: 24px;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #fff;
    }
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .metric-card {
      background: rgba(13, 17, 26, 0.85);
      border: 1px solid #1e2638;
      border-radius: 10px;
      padding: 16px;
    }
    .metric-num {
      font-size: 24px;
      font-weight: 700;
      color: #00e5ff;
    }
    .metric-label {
      font-size: 12px;
      color: #8a99ad;
      text-transform: uppercase;
    }
    .filter-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    input, select {
      background: #090c12;
      border: 1px solid #1e2638;
      color: #fff;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      outline: none;
    }
    input:focus, select:focus {
      border-color: #00e5ff;
    }
    .table-container {
      background: rgba(13, 17, 26, 0.85);
      border: 1px solid #1e2638;
      border-radius: 10px;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      padding: 12px 14px;
      color: #8a99ad;
      font-size: 12px;
      text-transform: uppercase;
      border-bottom: 1px solid #1e2638;
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(30, 38, 56, 0.5);
      font-size: 13px;
    }
    tr:hover td {
      background: rgba(20, 26, 39, 0.8);
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
    }
    .badge-success { background: rgba(0, 204, 136, 0.2); color: #00cc88; border: 1px solid #00cc88; }
    .badge-failure { background: rgba(255, 51, 102, 0.2); color: #ff3366; border: 1px solid #ff3366; }
    .risk-high { color: #ff3366; font-weight: 700; }
    .risk-med { color: #ffcc00; font-weight: 600; }
    .risk-low { color: #00cc88; }
  `;

  @state() events: any[] = [];
  @state() summary: any = {};
  @state() searchUser = '';
  @state() selectedProvider = '';
  @state() minRisk = 0;

  connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  async loadData() {
    try {
      this.summary = await fetchIdentitySummary();
      this.events = await fetchEvents({
        identity_user: this.searchUser,
        provider: this.selectedProvider || undefined,
        min_risk: this.minRisk
      });
    } catch (e) {
      console.error(e);
    }
  }

  render() {
    return html`
      <div class="header">
        <h1 class="title">Identity Telemetry Stream Monitor</h1>
        <p style="color: #8a99ad;">Real-time authentication log stream across AD, Entra ID, AWS IAM, ForgeRock, and Zscaler.</p>
      </div>

      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-num">${this.summary.total_events || 0}</div>
          <div class="metric-label">Total Telemetry Events</div>
        </div>
        <div class="metric-card">
          <div class="metric-num" style="color: #ff3366;">${this.summary.high_risk_events || 0}</div>
          <div class="metric-label">High Risk Events (≥70)</div>
        </div>
        <div class="metric-card">
          <div class="metric-num" style="color: #ff9900;">${this.summary.failed_logins || 0}</div>
          <div class="metric-label">Failed Authentication Attempts</div>
        </div>
        <div class="metric-card">
          <div class="metric-num">${this.summary.monitored_identities || 0}</div>
          <div class="metric-label">Active User Identities</div>
        </div>
      </div>

      <div class="filter-bar">
        <input type="text" placeholder="Search identity (e.g. john.smith@scb.com)..." .value=${this.searchUser}
               @input=${(e: any) => { this.searchUser = e.target.value; this.loadData(); }} />
        
        <select @change=${(e: any) => { this.selectedProvider = e.target.value; this.loadData(); }}>
          <option value="">All Identity Providers</option>
          <option value="ACTIVE_DIRECTORY">Active Directory</option>
          <option value="ENTRA_ID">Microsoft Entra ID</option>
          <option value="AWS_IAM">AWS IAM</option>
          <option value="FORGEROCK">ForgeRock</option>
          <option value="ZSCALER">Zscaler</option>
        </select>

        <select @change=${(e: any) => { this.minRisk = parseFloat(e.target.value); this.loadData(); }}>
          <option value="0">All Risk Scores</option>
          <option value="50">Medium Risk (≥50)</option>
          <option value="70">High Risk (≥70)</option>
        </select>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Event ID</th>
              <th>Timestamp</th>
              <th>Identity User</th>
              <th>Provider</th>
              <th>Event Type</th>
              <th>Source IP / Geo</th>
              <th>Result</th>
              <th>Risk Score</th>
            </tr>
          </thead>
          <tbody>
            ${this.events.length === 0 ? html`
              <tr><td colspan="8" style="text-align: center; color: #8a99ad;">No matching telemetry logs found.</td></tr>
            ` : this.events.map(evt => html`
              <tr>
                <td style="font-family: monospace; color: #8a99ad;">${evt.event_id}</td>
                <td>${evt.timestamp}</td>
                <td style="font-weight: 600; color: #00e5ff;">${evt.identity_user}</td>
                <td><span class="badge" style="background: rgba(0, 180, 216, 0.2); color: #00e5ff;">${evt.identity_provider}</span></td>
                <td>${evt.event_type}</td>
                <td>${evt.source_ip} <span style="color: #8a99ad;">(${evt.geo_location})</span></td>
                <td>
                  <span class="badge ${evt.success ? 'badge-success' : 'badge-failure'}">
                    ${evt.success ? 'Success' : 'Failure'}
                  </span>
                </td>
                <td class="${evt.risk_score >= 70 ? 'risk-high' : evt.risk_score >= 40 ? 'risk-med' : 'risk-low'}">
                  ${evt.risk_score}%
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `;
  }
}

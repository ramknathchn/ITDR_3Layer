import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { fetchProfiles } from '../services/api.js';

export class UebaScreen extends LitElement {
  static properties = {
    profiles: { type: Array },
    toastMsg: { type: String }
  };

  static styles = css`
    :host { display: block; color: var(--text-primary); }
    .header { margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; }
    .title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }
    .subtitle { color: var(--text-muted); font-size: 12px; margin-top: 2px; }

    .card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 18px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); margin-bottom: 20px; }
    .card-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }

    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 10px 12px; color: var(--text-muted); font-size: 11px; text-transform: uppercase; border-bottom: 1px solid var(--border-color); background: var(--bg-sidebar); }
    td { padding: 10px 12px; border-bottom: 1px solid var(--border-color); font-size: 12.5px; color: var(--text-primary); }

    .badge-pass { background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: 700; }
    .badge-fail { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: 700; }

    .btn { padding: 5px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary); }
    .btn:hover { border-color: var(--border-accent); color: var(--text-accent); }
    
    .toast { padding: 10px 14px; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #10b981; border-radius: 6px; font-size: 12px; margin-bottom: 14px; font-weight: 600; }
  `;

  constructor() {
    super();
    this.profiles = [];
    this.toastMsg = '';
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadProfiles();
  }

  async loadProfiles() {
    try {
      this.profiles = await fetchProfiles() || [];
    } catch (e) {
      console.error(e);
    }
  }

  handleResetBaseline(user) {
    this.toastMsg = `Reset risk baseline for user [${user}]`;
    setTimeout(() => { this.toastMsg = ''; }, 4000);
  }

  render() {
    return html`
      <!-- SCREEN 5: USER & ENTITY BEHAVIORAL RISK PROFILES (UEBA) -->
      <div class="header">
        <h1 class="title"><i class="fa-solid fa-users" style="color: #00ffff; margin-right: 8px;"></i> User & Entity Behavioral Risk Profiles (UEBA)</h1>
        <p class="subtitle">Leaderboard of user identity risk baselines, anomalies, and active security postures in SQL Server database (<code>identity_profiles</code>).</p>
      </div>

      ${this.toastMsg ? html`<div class="toast">${this.toastMsg}</div>` : ''}

      <!-- PROFILES LEADERBOARD TABLE CARD -->
      <div class="card">
        <div class="card-title">
          <span><i class="fa-solid fa-ranking-star" style="color: #00ffff; margin-right: 6px;"></i> Identity Risk Standings (Highest Risk First)</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Identity Name</th>
              <th>Type</th>
              <th>Department / Role</th>
              <th>Baseline Risk</th>
              <th>Current Risk Score</th>
              <th>Total Events</th>
              <th>Failed Logins (24h)</th>
              <th>Last Active Seen</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.profiles.map(p => html`
              <tr>
                <td style="font-weight: 700; color: var(--text-accent);">${p.identity_user}</td>
                <td><span style="font-size: 11px; color: var(--text-muted);">${p.identity_type || 'employee'}</span></td>
                <td style="color: var(--text-primary);">${p.department || 'DevOps Engineering'}</td>
                <td><span style="color: var(--color-success); font-weight: 700;">${p.baseline_risk_score}</span></td>
                <td><strong style="color: ${p.current_risk_score >= 70 ? 'var(--color-danger)' : 'var(--text-accent)'}; font-size: 14px;">${p.current_risk_score}</strong></td>
                <td style="text-align: center; color: var(--text-primary);">${p.total_events}</td>
                <td style="text-align: center; color: var(--color-danger); font-weight: 700;">${p.failed_logins_24h}</td>
                <td style="font-size: 11px; color: var(--text-muted);">${(p.last_seen || '2026-07-23').substring(0, 10)}</td>
                <td>
                  <span class="${p.current_risk_score >= 70 ? 'badge-fail' : 'badge-pass'}">
                    ${p.current_risk_score >= 70 ? 'HIGH RISK' : 'NORMAL'}
                  </span>
                </td>
                <td>
                  <button class="btn" @click=${() => this.handleResetBaseline(p.identity_user)}>Reset Baseline</button>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `;
  }
}

customElements.define('ueba-screen', UebaScreen);

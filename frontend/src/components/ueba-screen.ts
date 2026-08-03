import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { fetchProfiles } from '../services/api.js';

@customElement('ueba-screen')
export class UebaScreen extends LitElement {
  static styles = css`
    :host {
      display: block;
      color: #f0f4f8;
    }
    .header {
      margin-bottom: 24px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    .card {
      background: rgba(13, 17, 26, 0.85);
      border: 1px solid #1e2638;
      border-radius: 12px;
      padding: 20px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      border-color: #00e5ff;
      box-shadow: 0 0 15px rgba(0, 229, 255, 0.15);
    }
    .user-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .user-name {
      font-weight: 700;
      font-size: 15px;
      color: #fff;
    }
    .user-dept {
      font-size: 12px;
      color: #8a99ad;
    }
    .risk-score {
      font-size: 26px;
      font-weight: 800;
    }
    .risk-high { color: #ff3366; }
    .risk-low { color: #00cc88; }
    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(30, 38, 56, 0.5);
      font-size: 13px;
    }
    .meta-label { color: #8a99ad; }
    .meta-val { color: #fff; font-weight: 600; }
  `;

  @state() profiles: any[] = [];

  connectedCallback() {
    super.connectedCallback();
    this.loadProfiles();
  }

  async loadProfiles() {
    try {
      this.profiles = await fetchProfiles();
    } catch (e) {
      console.error(e);
    }
  }

  render() {
    return html`
      <div class="header">
        <h1 style="font-size: 24px; color: #fff;">UEBA Identity Risk Profiles</h1>
        <p style="color: #8a99ad;">User & Entity Behavior Analytics tracking risk baselines, login anomalies, and 24h risk dynamics.</p>
      </div>

      <div class="grid">
        ${this.profiles.map(p => html`
          <div class="card">
            <div class="user-header">
              <div>
                <div class="user-name">${p.identity_user}</div>
                <div class="user-dept">${p.department} (${p.identity_type})</div>
              </div>
              <div class="risk-score ${p.current_risk_score >= 70 ? 'risk-high' : 'risk-low'}">
                ${p.current_risk_score}%
              </div>
            </div>

            <div class="meta-row">
              <span class="meta-label">Baseline Risk Score:</span>
              <span class="meta-val">${p.baseline_risk_score}%</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Failed Logins (24h):</span>
              <span class="meta-val" style="${p.failed_logins_24h > 0 ? 'color: #ff3366;' : ''}">${p.failed_logins_24h}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Total Evaluated Events:</span>
              <span class="meta-val">${p.total_events}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Normal Hours:</span>
              <span class="meta-val">${p.normal_hours || '08:00-18:00'}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Trusted Locations:</span>
              <span class="meta-val">${p.normal_locations || 'Singapore'}</span>
            </div>
          </div>
        `)}
      </div>
    `;
  }
}

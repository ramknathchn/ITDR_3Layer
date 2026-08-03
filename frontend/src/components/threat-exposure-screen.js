import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { fetchThreatExposureReport } from '../services/api.js';

export class ThreatExposureScreen extends LitElement {
  static properties = {
    reportData: { type: Object },
    loading: { type: Boolean }
  };

  static styles = css`
    :host { display: block; font-family: 'Inter', sans-serif; color: var(--text-primary, #e2e8f0); }

    .header-bar {
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border-color, #1e2638);
      padding-bottom: 16px;
    }
    
    .title {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .subtitle {
      color: #94a3b8;
      font-size: 13px;
      margin-top: 4px;
    }

    /* Badges Bar */
    .badges-bar {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
    }

    .stat-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid #1e2638;
      border-radius: 8px;
      padding: 10px 18px;
    }

    .badge-lbl {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
    }

    .badge-num {
      font-size: 26px;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
    }

    .badge-num.sighted { color: #ffffff; }
    .badge-num.covered { color: #10b981; }
    .badge-num.uncovered { color: #ef4444; }

    /* Horizontal Scroll Matrix Container */
    .matrix-wrapper {
      display: flex;
      gap: 14px;
      overflow-x: auto;
      padding-bottom: 20px;
      scroll-behavior: smooth;
    }

    .matrix-column {
      flex: 0 0 240px;
      background: rgba(10, 14, 23, 0.95);
      border: 1px solid #1e2638;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
    }

    .column-header {
      background: #0f172a;
      padding: 12px 14px;
      border-bottom: 1px solid #1e2638;
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
    }

    .tactic-title {
      font-size: 12px;
      font-weight: 800;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .tactic-count {
      font-size: 10.5px;
      color: #94a3b8;
      margin-top: 2px;
    }

    .cards-container {
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 620px;
      overflow-y: auto;
    }

    /* Technique Card */
    .tech-card {
      border-radius: 6px;
      padding: 8px 10px;
      position: relative;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      cursor: pointer;
    }

    .tech-card:hover {
      transform: translateY(-2px);
    }

    .tech-card.covered {
      background: rgba(16, 185, 129, 0.12);
      border: 1.5px solid #10b981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.2);
    }

    .tech-card.uncovered {
      background: rgba(225, 29, 72, 0.15);
      border: 1.5px solid #e11d48;
      box-shadow: 0 0 8px rgba(225, 29, 72, 0.2);
    }

    .tech-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .tech-id {
      font-family: monospace;
      font-size: 11px;
      font-weight: 800;
    }

    .tech-card.covered .tech-id { color: #10b981; }
    .tech-card.uncovered .tech-id { color: #f43f5e; }

    .tech-freq {
      font-size: 10.5px;
      font-weight: 700;
      color: #ffffff;
      background: rgba(0, 0, 0, 0.4);
      padding: 1px 5px;
      border-radius: 4px;
    }

    .tech-name {
      font-size: 11.5px;
      font-weight: 600;
      color: #ffffff;
      margin-top: 4px;
      line-height: 1.3;
    }
  `;

  constructor() {
    super();
    this.reportData = null;
    this.loading = true;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      this.reportData = await fetchThreatExposureReport();
    } catch (e) {
      console.error("Error loading threat exposure report:", e);
    } finally {
      this.loading = false;
    }
  }

  render() {
    if (this.loading) {
      return html`
        <div style="padding: 40px; text-align: center; color: #00e5ff;">
          <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
          <p style="margin-top: 10px; font-weight: 600;">Loading Identity Threat Exposure Heatmap...</p>
        </div>
      `;
    }

    const data = this.reportData || {};
    const tactics = data.tactics || [];

    return html`
      <div>
        <div class="header-bar">
          <div class="title">
            <i class="fa-solid fa-triangle-exclamation" style="color: #10b981;"></i> Identity Threat Exposure
          </div>
          <div class="subtitle">
            Exposure analytics based on ${data.mitre_ttps_sighted || 126} intelligence reports and multi-plane telemetry posture verification
          </div>
        </div>

        <!-- Badges Bar -->
        <div class="badges-bar">
          <div class="stat-badge">
            <div>
              <div class="badge-lbl">MITRE TTPS SIGHTED</div>
              <div class="badge-num sighted">${data.mitre_ttps_sighted || 126}</div>
            </div>
          </div>
          <div class="stat-badge" style="border-color: rgba(16, 185, 129, 0.4);">
            <div>
              <div class="badge-lbl" style="color: #10b981;">SIGHTED WITH COVERAGE</div>
              <div class="badge-num covered">${data.sighted_with_coverage || 39}</div>
            </div>
          </div>
          <div class="stat-badge" style="border-color: rgba(239, 68, 68, 0.4);">
            <div>
              <div class="badge-lbl" style="color: #ef4444;">SIGHTED WITHOUT COVERAGE</div>
              <div class="badge-num uncovered">${data.sighted_without_coverage || 87}</div>
            </div>
          </div>
        </div>

        <!-- 12 MITRE Tactic Columns Grid -->
        <div class="matrix-wrapper">
          ${tactics.map(tac => html`
            <div class="matrix-column">
              <div class="column-header">
                <div class="tactic-title">${tac.tactic_name}</div>
                <div class="tactic-count">${tac.technique_count} Techniques</div>
              </div>
              <div class="cards-container">
                ${tac.techniques.map(tech => html`
                  <div class="tech-card ${tech.has_coverage ? 'covered' : 'uncovered'}">
                    <div class="tech-header">
                      <span class="tech-id">${tech.technique_id}</span>
                      <span class="tech-freq">${tech.frequency_count}</span>
                    </div>
                    <div class="tech-name">${tech.technique_name}</div>
                  </div>
                `)}
              </div>
            </div>
          `)}
        </div>
      </div>
    `;
  }
}

customElements.define('threat-exposure-screen', ThreatExposureScreen);

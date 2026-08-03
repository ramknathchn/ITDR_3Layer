import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { fetchThreatScenariosReport, analyzeThreatText } from '../services/api.js';

export class ThreatScenariosScreen extends LitElement {
  static properties = {
    scenariosData: { type: Object },
    loading: { type: Boolean },
    selectedScenario: { type: Object },
    inspecting: { type: Boolean },
    inspectResults: { type: Object }
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
      max-width: 900px;
      line-height: 1.5;
    }

    /* Scenarios Table Container */
    .table-card {
      background: rgba(10, 14, 23, 0.95);
      border: 1px solid #1e2638;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 12px 14px; color: #8a99ad; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #1e2638; background: #0b0f19; font-weight: 700; }
    td { padding: 14px; border-bottom: 1px solid #1e2638; font-size: 13px; color: #e2e8f0; vertical-align: middle; }
    tr:hover td { background: rgba(0, 229, 255, 0.03); }

    .scenario-name {
      font-weight: 700;
      color: #38bdf8;
      cursor: pointer;
    }
    .scenario-name:hover { text-decoration: underline; color: #00e5ff; }

    .source-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid #334155;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      color: #cbd5e1;
    }

    /* Coverage Progress Bar */
    .coverage-box {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 160px;
    }

    .cov-text {
      font-size: 12px;
      font-weight: 700;
      width: 48px;
    }

    .cov-bar-bg {
      flex: 1;
      height: 8px;
      background: #090d16;
      border-radius: 4px;
      border: 1px solid #1e2638;
      overflow: hidden;
    }

    .cov-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .action-btn {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 14px;
      cursor: pointer;
      padding: 6px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }
    .action-btn:hover { color: #00e5ff; background: rgba(0, 229, 255, 0.1); }

    /* Modal Backdrop */
    .backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(6px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-card {
      background: #0a0e17;
      border: 1px solid #00e5ff;
      border-radius: 12px;
      max-width: 900px;
      width: 100%;
      max-height: 85vh;
      overflow-y: auto;
      padding: 28px;
      box-shadow: 0 0 40px rgba(0, 229, 255, 0.2);
    }
  `;

  constructor() {
    super();
    this.scenariosData = null;
    this.loading = true;
    this.selectedScenario = null;
    this.inspecting = false;
    this.inspectResults = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      this.scenariosData = await fetchThreatScenariosReport();
    } catch (e) {
      console.error("Error loading threat scenarios report:", e);
    } finally {
      this.loading = false;
    }
  }

  async handleInspectScenario(sc) {
    this.selectedScenario = sc;
    this.inspecting = true;
    try {
      // Analyze bulletin scenario text using 3-layer rule engine
      const res = await analyzeThreatText(
        `ADVISORY: Threat Scenario ${sc.scenario_name}. Target accounts T1078, Remote Services T1021, and LSASS Memory Dump T1081.006.`,
        '3layer_rule_engine'
      );
      this.inspectResults = res;
    } catch (e) {
      console.error(e);
    } finally {
      this.inspecting = false;
    }
  }

  renderCoverageBar(pct, type = 'detection') {
    if (pct == null) {
      return html`<span style="color: #64748b; font-size: 11.5px; font-style: italic;">Not Assessed</span>`;
    }

    const val = Number(pct);
    let color = '#ef4444';
    if (val >= 65) color = '#10b981';
    else if (val >= 35) color = '#f59e0b';

    return html`
      <div class="coverage-box">
        <span class="cov-text" style="color: ${color};">${val}%</span>
        <div class="cov-bar-bg">
          <div class="cov-bar-fill" style="width: ${Math.min(100, val)}%; background: ${color};"></div>
        </div>
      </div>
    `;
  }

  render() {
    if (this.loading) {
      return html`
        <div style="padding: 40px; text-align: center; color: #00e5ff;">
          <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
          <p style="margin-top: 10px; font-weight: 600;">Loading Identity Threat Scenarios Index...</p>
        </div>
      `;
    }

    const scenarios = this.scenariosData?.scenarios || [];

    return html`
      <div>
        <div class="header-bar">
          <div class="title">
            <i class="fa-solid fa-layer-group" style="color: #00e5ff;"></i> Identity Threat Scenarios
          </div>
          <div class="subtitle">
            Leverage AI to perform analysis of Identity Threats, Implemented Detection and Response Capabilities and IAM Controls against threats identified by advisory bulletins.
          </div>
        </div>

        <!-- Scenarios Table -->
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Scenario Name</th>
                <th>Intelligence Source</th>
                <th>Date Assessed</th>
                <th>Detection Coverage</th>
                <th>Mitigation Coverage</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${scenarios.map(sc => html`
                <tr>
                  <td>
                    <div class="scenario-name" @click=${() => this.handleInspectScenario(sc)}>
                      ${sc.scenario_name}
                    </div>
                  </td>
                  <td>
                    <span class="source-badge">
                      <i class="${sc.intel_source === 'FILE' ? 'fa-solid fa-file-code' : 'fa-solid fa-globe'}"></i>
                      ${sc.intel_source}
                    </span>
                  </td>
                  <td style="color: #94a3b8; font-size: 12px;">${sc.date_assessed}</td>
                  <td>${this.renderCoverageBar(sc.detection_coverage_pct, 'detection')}</td>
                  <td>${this.renderCoverageBar(sc.mitigation_coverage_pct, 'mitigation')}</td>
                  <td style="text-align: right;">
                    <button class="action-btn" title="Inspect Scenario" @click=${() => this.handleInspectScenario(sc)}>
                      <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="action-btn" title="Delete Record">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>

        <!-- SCENARIO DRILL-DOWN INSPECTION MODAL -->
        ${this.selectedScenario ? html`
          <div class="backdrop" @click=${(e) => { if (e.target.classList.contains('backdrop')) this.selectedScenario = null; }}>
            <div class="modal-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #1e2638; padding-bottom: 14px;">
                <div>
                  <h2 style="font-size: 18px; color: #00e5ff; margin: 0;">
                    🔍 Threat Scenario Drill-Down: ${this.selectedScenario.scenario_name}
                  </h2>
                  <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Assessed at: ${this.selectedScenario.date_assessed}</div>
                </div>
                <button style="background: none; border: none; color: #94a3b8; font-size: 22px; cursor: pointer;" @click=${() => this.selectedScenario = null}>&times;</button>
              </div>

              ${this.inspecting ? html`
                <div style="padding: 30px; text-align: center; color: #00e5ff;">
                  <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
                  <p style="margin-top: 10px;">Running 3-Layer DB Rule Engine Posture Audit...</p>
                </div>
              ` : html`
                ${this.inspectResults ? html`
                  <pipeline-stepper-view .traceData=${this.inspectResults.pipeline_trace}></pipeline-stepper-view>
                ` : ''}
              `}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('threat-scenarios-screen', ThreatScenariosScreen);

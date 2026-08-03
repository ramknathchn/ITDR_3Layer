import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { fetchIdentityResilienceReport, analyzeThreatText } from '../services/api.js?v=3';

export class ResilienceScreen extends LitElement {
  static properties = {
    reportData: { type: Object },
    loading: { type: Boolean },
    sourceMode: { type: String },
    zoomLevel: { type: Number },
    hoveredItem: { type: Object },
    selectedItem: { type: Object },
    inspecting: { type: Boolean },
    inspectResults: { type: Object }
  };

  static styles = css`
    :host { display: block; font-family: 'Inter', sans-serif; color: var(--text-primary, #e2e8f0); }

    .header-bar {
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border-color, #1e2638);
      padding-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
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
      max-width: 800px;
    }

    /* Toggle Mode Buttons */
    .toggle-group {
      display: inline-flex;
      background: #090d16;
      border: 1px solid #1e2638;
      border-radius: 8px;
      padding: 4px;
      gap: 4px;
    }

    .toggle-btn {
      background: none;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .toggle-btn.active {
      background: #00e5ff;
      color: #050811;
      box-shadow: 0 0 12px rgba(0, 229, 255, 0.4);
    }

    /* Zoom Controls Bar */
    .zoom-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #090d16;
      border: 1px solid #1e2638;
      border-radius: 6px;
      padding: 4px 10px;
    }

    .zoom-btn {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid #334155;
      color: #00e5ff;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .zoom-btn:hover { background: #00e5ff; color: #050811; }

    .zoom-label {
      font-size: 12px;
      font-weight: 800;
      color: #cbd5e1;
      min-width: 48px;
      text-align: center;
    }

    /* KPI Row */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background: rgba(10, 14, 23, 0.95);
      border: 1px solid #1e2638;
      border-radius: 10px;
      padding: 16px 20px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    .kpi-lbl {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.5px;
    }

    .kpi-val {
      font-size: 28px;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
      margin-top: 4px;
    }

    /* 2x2 QUADRANT CHART CONTAINER */
    .quadrant-wrapper {
      background: rgba(10, 14, 23, 0.95);
      border: 1px solid #1e2638;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    }

    .quadrant-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .quadrant-title {
      font-size: 16px;
      font-weight: 700;
      color: #00e5ff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* 2x2 Canvas Grid Container */
    .canvas-container {
      position: relative;
      width: 100%;
      height: 520px;
      background: #050811;
      border: 2px solid #1e2638;
      border-radius: 10px;
      overflow: hidden;
    }

    /* Scalable Zoom Transform Box */
    .canvas-viewport {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      transition: transform 0.25s cubic-bezier(0.2, 0, 0, 1);
    }

    /* Quadrant Sub-Regions */
    .quadrant-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0; left: 0;
    }

    .quad-cell {
      position: relative;
      padding: 16px;
      border: 1px dashed rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .quad-cell.q1 { background: rgba(16, 185, 129, 0.06); border-color: rgba(16, 185, 129, 0.2); }
    .quad-cell.q2 { background: rgba(245, 158, 11, 0.06); border-color: rgba(245, 158, 11, 0.2); }
    .quad-cell.q3 { background: rgba(56, 189, 248, 0.06); border-color: rgba(56, 189, 248, 0.2); }
    .quad-cell.q4 { background: rgba(239, 68, 68, 0.06); border-color: rgba(239, 68, 68, 0.2); }

    .quad-name {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .quad-cell.q1 .quad-name { color: #10b981; }
    .quad-cell.q2 .quad-name { color: #f59e0b; }
    .quad-cell.q3 .quad-name { color: #38bdf8; }
    .quad-cell.q4 .quad-name { color: #ef4444; }

    .quad-desc {
      font-size: 11px;
      color: #64748b;
    }

    /* DOT PLOT NODES */
    .dot-plot {
      position: absolute;
      transform: translate(-50%, 50%);
      z-index: 10;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: transform 0.15s ease, z-index 0.15s ease;
    }

    .dot-plot:hover {
      z-index: 99;
      transform: translate(-50%, 50%) scale(1.35);
    }

    /* Glowing Dot Circle */
    .dot-circle {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid #ffffff;
      box-shadow: 0 0 12px rgba(0, 0, 0, 0.8);
      position: relative;
    }

    .dot-circle.optimal {
      background: radial-gradient(circle, #34d399 0%, #10b981 100%);
      border-color: #34d399;
      box-shadow: 0 0 14px rgba(16, 185, 129, 0.8);
    }
    .dot-circle.monitored {
      background: radial-gradient(circle, #fbbf24 0%, #f59e0b 100%);
      border-color: #fbbf24;
      box-shadow: 0 0 14px rgba(245, 158, 11, 0.8);
    }
    .dot-circle.blindspot {
      background: radial-gradient(circle, #7dd3fc 0%, #38bdf8 100%);
      border-color: #7dd3fc;
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.8);
    }
    .dot-circle.critical {
      background: radial-gradient(circle, #f87171 0%, #ef4444 100%);
      border-color: #f87171;
      box-shadow: 0 0 14px rgba(239, 68, 68, 0.8);
    }

    .dot-label {
      font-size: 10px;
      font-weight: 700;
      color: #ffffff;
      background: rgba(5, 8, 17, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 1px 5px;
      border-radius: 4px;
      margin-top: 3px;
      white-space: nowrap;
      pointer-events: none;
    }

    /* Floating Detail Tooltip Popover */
    .popover-card {
      position: absolute;
      bottom: 24px;
      right: 24px;
      background: #090d16;
      border: 1px solid #00e5ff;
      border-radius: 10px;
      padding: 16px;
      max-width: 340px;
      z-index: 100;
      box-shadow: 0 0 30px rgba(0, 229, 255, 0.25);
    }

    /* Axis Labels */
    .axis-label-x {
      text-align: center;
      font-size: 11.5px;
      font-weight: 700;
      color: #00e5ff;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 10px;
    }

    .axis-label-y {
      position: absolute;
      left: -110px;
      top: 50%;
      transform: rotate(-90deg) translateY(-50%);
      font-size: 11.5px;
      font-weight: 700;
      color: #00e5ff;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Breakdown Table */
    .table-card {
      background: rgba(10, 14, 23, 0.95);
      border: 1px solid #1e2638;
      border-radius: 10px;
      padding: 20px;
    }

    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 12px 14px; color: #8a99ad; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #1e2638; background: #0b0f19; font-weight: 700; }
    td { padding: 14px; border-bottom: 1px solid #1e2638; font-size: 13px; color: #e2e8f0; vertical-align: middle; }
    tr:hover td { background: rgba(0, 229, 255, 0.03); }

    .sub-name { font-weight: 700; color: #ffffff; }
    .sub-cat { font-size: 11.5px; color: #8a99ad; }

    .badge-quad {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      display: inline-block;
    }
    .badge-quad.q1 { background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; }
    .badge-quad.q2 { background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid #f59e0b; }
    .badge-quad.q3 { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid #38bdf8; }
    .badge-quad.q4 { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }

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
    this.reportData = null;
    this.loading = true;
    this.sourceMode = 'subsystems';
    this.zoomLevel = 1.0;
    this.hoveredItem = null;
    this.selectedItem = null;
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
      this.reportData = await fetchIdentityResilienceReport(this.sourceMode);
    } catch (e) {
      console.error("Error loading resilience report:", e);
    } finally {
      this.loading = false;
    }
  }

  switchSourceMode(mode) {
    if (this.sourceMode === mode) return;
    this.sourceMode = mode;
    this.zoomLevel = 1.0;
    this.hoveredItem = null;
    this.loadData();
  }

  zoomIn() {
    this.zoomLevel = Math.min(4.0, roundVal(this.zoomLevel + 0.5));
  }

  zoomOut() {
    this.zoomLevel = Math.max(1.0, roundVal(this.zoomLevel - 0.5));
  }

  resetZoom() {
    this.zoomLevel = 1.0;
  }

  handleWheel(e) {
    e.preventDefault();
    if (e.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  async handleInspectThreat(item) {
    this.selectedItem = item;
    if (this.sourceMode !== 'threats') return;
    this.inspecting = true;
    try {
      const res = await analyzeThreatText(
        `ADVISORY: ${item.name}. Target T1078 Valid Accounts, T1059 Command Execution, and T1110 Credential Access.`,
        '3layer_rule_engine'
      );
      this.inspectResults = res;
    } catch (e) {
      console.error(e);
    } finally {
      this.inspecting = false;
    }
  }

  getDotClass(quadrant) {
    if (quadrant === 'OPTIMAL_RESILIENCE') return 'optimal';
    if (quadrant === 'MONITORED_EXPOSURE') return 'monitored';
    if (quadrant === 'PREVENTIVE_BLINDSPOT') return 'blindspot';
    return 'critical';
  }

  getBadgeClass(quadrant) {
    if (quadrant === 'OPTIMAL_RESILIENCE') return 'q1';
    if (quadrant === 'MONITORED_EXPOSURE') return 'q2';
    if (quadrant === 'PREVENTIVE_BLINDSPOT') return 'q3';
    return 'q4';
  }

  render() {
    if (this.loading) {
      return html`
        <div style="padding: 40px; text-align: center; color: #00e5ff;">
          <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
          <p style="margin-top: 10px; font-weight: 600;">Loading 2x2 Resilience Quadrant (${this.sourceMode === 'threats' ? 'All Ingested Threats' : 'Identity Subsystems'})...</p>
        </div>
      `;
    }

    const data = this.reportData || {};
    const items = data.subsystems || [];
    const counts = data.quadrant_counts || {};

    return html`
      <div>
        <div class="header-bar">
          <div>
            <div class="title">
              <i class="fa-solid fa-chart-pie" style="color: #00e5ff;"></i> Identity Resilience Dashboard
            </div>
            <div class="subtitle">
              2x2 Resilience Quadrant mapping Detection & Response Capabilities against Preventive IAM Controls
            </div>
          </div>

          <!-- TOGGLE SOURCE MODE SWITCH -->
          <div class="toggle-group">
            <button class="toggle-btn ${this.sourceMode === 'subsystems' ? 'active' : ''}" @click=${() => this.switchSourceMode('subsystems')}>
              <i class="fa-solid fa-server"></i> By Identity Subsystems
            </button>
            <button class="toggle-btn ${this.sourceMode === 'threats' ? 'active' : ''}" @click=${() => this.switchSourceMode('threats')}>
              <i class="fa-solid fa-skull-crossbones"></i> By All Ingested Threats (${items.length})
            </button>
          </div>
        </div>

        <!-- KPI Row -->
        <div class="kpi-row">
          <div class="kpi-card" style="border-color: #00e5ff;">
            <div class="kpi-lbl">Overall Resilience Score</div>
            <div class="kpi-val" style="color: #00e5ff;">${data.overall_resilience_score || 53.1}%</div>
          </div>
          <div class="kpi-card" style="border-color: #10b981;">
            <div class="kpi-lbl" style="color: #10b981;">Optimal Resilience (Q1)</div>
            <div class="kpi-val" style="color: #10b981;">${counts.optimal_resilience || 0} ${this.sourceMode === 'threats' ? 'Threats' : 'Systems'}</div>
          </div>
          <div class="kpi-card" style="border-color: #f59e0b;">
            <div class="kpi-lbl" style="color: #f59e0b;">Monitored Exposure (Q2)</div>
            <div class="kpi-val" style="color: #f59e0b;">${counts.monitored_exposure || 0} ${this.sourceMode === 'threats' ? 'Threats' : 'Systems'}</div>
          </div>
          <div class="kpi-card" style="border-color: #ef4444;">
            <div class="kpi-lbl" style="color: #ef4444;">Critical Gaps (Q4)</div>
            <div class="kpi-val" style="color: #ef4444;">${counts.critical_vulnerability_gap || 0} ${this.sourceMode === 'threats' ? 'Threats' : 'Systems'}</div>
          </div>
        </div>

        <!-- 2x2 RESILIENCE QUADRANT CHART WITH DOTS AND INTERACTIVE ZOOM -->
        <div class="quadrant-wrapper">
          <div class="quadrant-header">
            <div class="quadrant-title">
              <i class="fa-solid fa-border-all"></i> 2x2 Identity Resilience Quadrant (${this.sourceMode === 'threats' ? 'Plotted as Interactive Dots' : 'Plotted by Subsystems'})
            </div>

            <!-- ZOOM CONTROLS BAR -->
            <div class="zoom-bar">
              <span class="zoom-label"><i class="fa-solid fa-magnifying-glass"></i> ${Math.round(this.zoomLevel * 100)}%</span>
              <button class="zoom-btn" title="Zoom In" @click=${this.zoomIn}>
                <i class="fa-solid fa-plus"></i>
              </button>
              <button class="zoom-btn" title="Zoom Out" @click=${this.zoomOut}>
                <i class="fa-solid fa-minus"></i>
              </button>
              <button class="zoom-btn" title="Reset Zoom" @click=${this.resetZoom}>
                <i class="fa-solid fa-rotate-left"></i> Reset
              </button>
            </div>
          </div>

          <div style="position: relative;">
            <div class="axis-label-y">▲ Detection Coverage (0% - 100%)</div>

            <div class="canvas-container" @wheel=${this.handleWheel}>
              <!-- Viewport Box with Transform Zoom Scale -->
              <div class="canvas-viewport" style="transform: scale(${this.zoomLevel}); transform-origin: center;">
                
                <!-- 4 Quadrant Background Regions -->
                <div class="quadrant-grid">
                  <!-- Q2: Monitored Exposure (Top Left) -->
                  <div class="quad-cell q2">
                    <div class="quad-name">Q2: Monitored Exposure</div>
                    <div class="quad-desc">Detections Active • Preventive Controls Missing</div>
                  </div>
                  <!-- Q1: Optimal Resilience (Top Right) -->
                  <div class="quad-cell q1" style="text-align: right;">
                    <div class="quad-name">Q1: Optimal Resilience</div>
                    <div class="quad-desc">High Detection • High Preventive Hardening</div>
                  </div>
                  <!-- Q4: Critical Vulnerability Gap (Bottom Left) -->
                  <div class="quad-cell q4">
                    <div class="quad-desc">Low Detection • Low Preventive Controls</div>
                    <div class="quad-name">Q4: Critical Vulnerability Gap</div>
                  </div>
                  <!-- Q3: Preventive Blindspot (Bottom Right) -->
                  <div class="quad-cell q3" style="text-align: right;">
                    <div class="quad-desc">Preventive Controls Active • Telemetry Missing</div>
                    <div class="quad-name">Q3: Preventive Blindspot</div>
                  </div>
                </div>

                <!-- Plot Nodes as Glowing Dots -->
                ${items.map(item => html`
                  <div class="dot-plot" style="left: ${item.mitigation_coverage_pct}%; bottom: ${item.detection_coverage_pct}%;"
                       @mouseenter=${() => this.hoveredItem = item}
                       @mouseleave=${() => this.hoveredItem = null}
                       @click=${() => this.handleInspectThreat(item)}>
                    <div class="dot-circle ${this.getDotClass(item.quadrant)}"></div>
                    <div class="dot-label">${item.id}</div>
                  </div>
                `)}
              </div>

              <!-- FLOATING POPOVER TOOLTIP ON HOVER/SELECT -->
              ${this.hoveredItem ? html`
                <div class="popover-card">
                  <div style="font-size: 13px; font-weight: 800; color: #ffffff; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
                    <span>${this.hoveredItem.id}</span>
                    <span class="badge-quad ${this.getBadgeClass(this.hoveredItem.quadrant)}">${this.hoveredItem.status}</span>
                  </div>
                  <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px; line-height: 1.3;">
                    ${this.hoveredItem.name}
                  </div>
                  <div style="font-size: 11.5px; display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #94a3b8;">Detection Coverage:</span>
                    <strong style="color: #00e5ff;">${this.hoveredItem.detection_coverage_pct}%</strong>
                  </div>
                  <div style="font-size: 11.5px; display: flex; justify-content: space-between;">
                    <span style="color: #94a3b8;">Mitigation Coverage:</span>
                    <strong style="color: #10b981;">${this.hoveredItem.mitigation_coverage_pct}%</strong>
                  </div>
                </div>
              ` : ''}
            </div>

            <div class="axis-label-x">Mitigation / Preventive Coverage (0% - 100%) ▶</div>
          </div>
        </div>

        <!-- BREAKDOWN TABLE -->
        <div class="table-card">
          <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
            <span>${this.sourceMode === 'threats' ? 'All Ingested Threat Bulletins Resilience Breakdown' : 'Subsystem Identity Posture & Controls Breakdown'}</span>
            <span style="font-size: 12px; color: #8a99ad;">${items.length} ${this.sourceMode === 'threats' ? 'Threat Scenarios' : 'Subsystems'} Plotted</span>
          </div>

          <table>
            <thead>
              <tr>
                <th>${this.sourceMode === 'threats' ? 'Threat Scenario ID & Title' : 'Subsystem Name'}</th>
                <th>Category</th>
                <th>Detection Coverage</th>
                <th>Mitigation Coverage</th>
                <th>Resilience Quadrant</th>
                <th>Active Controls</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => html`
                <tr style="cursor: pointer;" @click=${() => this.handleInspectThreat(item)}>
                  <td>
                    <div class="sub-name" style="color: #38bdf8;">${item.name}</div>
                  </td>
                  <td><div class="sub-cat">${item.category}</div></td>
                  <td>
                    <div style="font-weight: 700; color: #00e5ff;">${item.detection_coverage_pct}%</div>
                  </td>
                  <td>
                    <div style="font-weight: 700; color: #10b981;">${item.mitigation_coverage_pct}%</div>
                  </td>
                  <td>
                    <span class="badge-quad ${this.getBadgeClass(item.quadrant)}">
                      ${item.quadrant_label}
                    </span>
                  </td>
                  <td style="font-size: 12px; color: #cbd5e1;">
                    Detections: <strong>${item.active_detections}</strong> / Mitigations: <strong>${item.preventive_controls}</strong>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>

        <!-- INSPECTION MODAL FOR THREAT SCENARIO DRILL-DOWN -->
        ${this.selectedItem && this.sourceMode === 'threats' ? html`
          <div class="backdrop" @click=${(e) => { if (e.target.classList.contains('backdrop')) this.selectedItem = null; }}>
            <div class="modal-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #1e2638; padding-bottom: 14px;">
                <div>
                  <h2 style="font-size: 18px; color: #00e5ff; margin: 0;">
                    🔍 Threat Scenario Inspection: ${this.selectedItem.name}
                  </h2>
                  <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Quadrant: ${this.selectedItem.quadrant_label}</div>
                </div>
                <button style="background: none; border: none; color: #94a3b8; font-size: 22px; cursor: pointer;" @click=${() => this.selectedItem = null}>&times;</button>
              </div>

              ${this.inspecting ? html`
                <div style="padding: 30px; text-align: center; color: #00e5ff;">
                  <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
                  <p style="margin-top: 10px;">Running 3-Layer Rule Engine Posture Audit...</p>
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

function roundVal(v) { return Math.round(v * 10) / 10; }

customElements.define('resilience-screen', ResilienceScreen);

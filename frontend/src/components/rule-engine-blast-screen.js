import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { calculateRuleEngineBlastRadius, triggerBlastRadiusMigration } from '../services/api.js?v=3';

export class RuleEngineBlastScreen extends LitElement {
  static properties = {
    entryEntity: { type: String },
    blastData: { type: Object },
    loading: { type: Boolean },
    migrating: { type: Boolean },
    viewMode: { type: String }, // 'graph' or 'tree'
    selectedNode: { type: Object }
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
      color: var(--text-primary, #ffffff);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .subtitle {
      color: var(--text-muted, #94a3b8);
      font-size: 13px;
      margin-top: 4px;
      max-width: 900px;
    }

    /* Action Bar */
    .action-bar {
      display: flex;
      align-items: center;
      gap: 14px;
      background: var(--bg-card, #0d0e12);
      border: 1px solid var(--border-color, #1e2638);
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 24px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    .select-box {
      flex: 1;
      background: var(--bg-input, #090d16);
      border: 1px solid var(--border-color, #334155);
      color: var(--text-accent, #00e5ff);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      outline: none;
    }

    .calc-btn {
      background: #00e5ff;
      color: #050811;
      border: none;
      padding: 10px 22px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 0 16px rgba(0, 229, 255, 0.4);
    }
    .calc-btn:hover { background: #38bdf8; transform: translateY(-1px); }

    .sync-btn {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid #334155;
      color: #94a3b8;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .sync-btn:hover { color: #10b981; border-color: #10b981; }

    .toggle-btn {
      background: #090d16;
      border: 1px solid #334155;
      color: #cbd5e1;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .toggle-btn.active {
      background: rgba(0, 229, 255, 0.15);
      border-color: #00e5ff;
      color: #00e5ff;
      box-shadow: 0 0 10px rgba(0, 229, 255, 0.3);
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

    /* GRAPH & TREE CONTAINER */
    .graph-card {
      background: rgba(10, 14, 23, 0.95);
      border: 1px solid #1e2638;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
      position: relative;
    }

    .graph-header {
      font-size: 16px;
      font-weight: 700;
      color: #00e5ff;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }

    #rule-blast-cy-canvas {
      width: 100%;
      height: 520px;
      background: #050811;
      border: 1px solid #1e2638;
      border-radius: 8px;
      position: relative;
    }

    .hop-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 14px;
      overflow-x: auto;
      padding-bottom: 10px;
    }

    .hop-column {
      background: #050811;
      border: 1px solid #1e2638;
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .hop-title {
      font-size: 11px;
      font-weight: 800;
      color: #00e5ff;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid #1e2638;
      padding-bottom: 6px;
      display: flex;
      justify-content: space-between;
    }

    .node-card {
      background: #090d16;
      border: 1px solid #1e2638;
      border-radius: 6px;
      padding: 10px;
      font-size: 12px;
      position: relative;
      transition: all 0.2s ease;
    }
    .node-card:hover { border-color: #00e5ff; transform: translateY(-2px); box-shadow: 0 0 12px rgba(0, 229, 255, 0.2); }

    .node-name { font-weight: 700; color: #ffffff; font-size: 12px; word-break: break-all; }
    .node-type { font-size: 10px; font-weight: 700; color: #8a99ad; margin-top: 2px; text-transform: uppercase; }
    .node-rel { font-size: 10.5px; color: #38bdf8; margin-top: 4px; font-family: monospace; }
    .node-risk { font-size: 11px; font-weight: 800; color: #ef4444; margin-top: 6px; text-align: right; }

    /* Node Inspector Card */
    .node-inspector {
      position: absolute;
      bottom: 34px;
      right: 34px;
      width: 280px;
      background: rgba(9, 13, 22, 0.95);
      border: 1px solid #00e5ff;
      border-radius: 8px;
      padding: 14px;
      box-shadow: 0 0 20px rgba(0, 229, 255, 0.25);
      z-index: 100;
    }

    /* Legend */
    .graph-legend-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(5, 8, 17, 0.9);
      border: 1px solid #1e2638;
      border-radius: 8px;
      padding: 10px 16px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .legend-header {
      font-size: 11px;
      font-weight: 800;
      color: #00e5ff;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-items {
      display: flex;
      align-items: center;
      gap: 18px;
      flex-wrap: wrap;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 11.5px;
      color: #cbd5e1;
      font-weight: 600;
    }
    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }
    .legend-line {
      width: 22px;
      height: 3px;
      background: #00e5ff;
      border-radius: 2px;
      display: inline-block;
    }

    /* Breakdown Table */
    .table-card {
      background: rgba(10, 14, 23, 0.95);
      border: 1px solid #1e2638;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 24px;
    }

    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 12px 14px; color: #8a99ad; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #1e2638; background: #0b0f19; font-weight: 700; }
    td { padding: 12px 14px; border-bottom: 1px solid #1e2638; font-size: 12.5px; color: #e2e8f0; vertical-align: middle; }
    tr:hover td { background: rgba(0, 229, 255, 0.03); }

    /* Defense Gaps Panel */
    .gaps-card {
      background: rgba(10, 14, 23, 0.95);
      border: 1px solid #1e2638;
      border-radius: 10px;
      padding: 20px;
    }

    .gap-item {
      background: #090d16;
      border: 1px solid #1e2638;
      border-left: 4px solid #ef4444;
      border-radius: 6px;
      padding: 14px;
      margin-bottom: 10px;
    }

    .gap-header { display: flex; justify-content: space-between; align-items: center; }
    .gap-code { font-weight: 800; color: #ef4444; font-size: 12px; }
    .gap-name { font-weight: 700; color: #ffffff; font-size: 13px; margin-left: 8px; }
    .gap-desc { font-size: 12px; color: #94a3b8; margin-top: 6px; }
    .gap-rec { font-size: 12px; color: #10b981; font-weight: 600; margin-top: 6px; background: rgba(16, 185, 129, 0.08); padding: 8px 10px; border-radius: 4px; }
  `;

  constructor() {
    super();
    this.entryEntity = "USER_JDOE";
    this.blastData = null;
    this.loading = true;
    this.migrating = false;
    this.viewMode = 'graph'; // 'graph' or 'tree'
    this.selectedNode = null;
    this.cy = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  updated(changedProperties) {
    if (changedProperties.has('entryEntity') && this.entryEntity) {
      this.loadData();
    }
    if (changedProperties.has('blastData') || changedProperties.has('viewMode')) {
      if (this.viewMode === 'graph') {
        setTimeout(() => this.renderCytoscapeGraph(), 100);
      }
    }
  }

  async loadData() {
    this.loading = true;
    try {
      this.blastData = await calculateRuleEngineBlastRadius(this.entryEntity);
    } catch (e) {
      console.error("Error calculating Blast Radius:", e);
    } finally {
      this.loading = false;
    }
  }

  async handleSyncSchema() {
    this.migrating = true;
    try {
      await triggerBlastRadiusMigration();
      await this.loadData();
    } catch (e) {
      console.error("Migration sync error:", e);
    } finally {
      this.migrating = false;
    }
  }

  renderCytoscapeGraph() {
    const container = this.shadowRoot.getElementById('rule-blast-cy-canvas');
    if (!container || !window.cytoscape) return;

    const data = this.blastData || {};
    const assets = data.reachable_assets || [];
    const entry = data.entry_entity || this.entryEntity || "USER_JDOE";

    const elements = [];

    // 1. Entry Point Node
    elements.push({
      data: {
        id: entry,
        label: `ENTRY: ${entry}`,
        type: 'ENTRY_POINT',
        hop: 0,
        color: '#00e5ff',
        size: 55
      }
    });

    const hopColors = {
      1: '#ef4444',
      2: '#f97316',
      3: '#f59e0b',
      4: '#a855f7',
      5: '#ec4899'
    };

    // 2. Reachable Target Asset Nodes & Edges
    assets.forEach((a, idx) => {
      const nodeColor = hopColors[a.hop_depth] || '#38bdf8';
      elements.push({
        data: {
          id: a.entity,
          label: a.entity,
          type: a.type,
          hop: a.hop_depth,
          risk: a.risk_contribution,
          criticality: a.criticality,
          sensitivity: a.sensitivity,
          color: nodeColor,
          size: 42
        }
      });

      // Parse edge source from path trace or construct link from previous hop
      let sourceNode = entry;
      if (a.path_trace) {
        const parts = a.path_trace.split(' -> ');
        if (parts.length >= 2) {
          sourceNode = parts[parts.length - 2];
        }
      }

      elements.push({
        data: {
          id: `edge_${idx}`,
          source: sourceNode,
          target: a.entity,
          label: a.relationship || 'LINK'
        }
      });
    });

    if (this.cy) {
      this.cy.destroy();
    }

    this.cy = window.cytoscape({
      container: container,
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'label': 'data(label)',
            'color': '#ffffff',
            'font-size': '11px',
            'font-weight': 'bold',
            'text-valign': 'bottom',
            'text-margin-y': '6px',
            'width': 'data(size)',
            'height': 'data(size)',
            'border-width': '2px',
            'border-color': '#ffffff',
            'shadow-blur': '12px',
            'shadow-color': 'data(color)'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#38bdf8',
            'target-arrow-color': '#38bdf8',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '9px',
            'color': '#94a3b8',
            'text-background-color': '#050811',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px'
          }
        }
      ],
      layout: {
        name: 'breadthfirst',
        directed: true,
        padding: 40,
        spacingFactor: 1.25,
        roots: [entry]
      }
    });

    // Node click handler for inspector
    this.cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      this.selectedNode = node.data();
    });
  }

  render() {
    const data = this.blastData || {};
    const assets = data.reachable_assets || [];
    const gaps = data.defense_gaps || [];

    // Group assets by hop depth
    const hopMap = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    assets.forEach(a => {
      if (hopMap[a.hop_depth]) {
        hopMap[a.hop_depth].push(a);
      }
    });

    return html`
      <div>
        <div class="header-bar">
          <div class="title">
            <i class="fa-solid fa-burst" style="color: #00e5ff;"></i> 3-Layer Engine Blast Radius Calculator
          </div>
          <div class="subtitle">
            Execute real-time 5-Hop Recursive CTE Graph Traversal & Risk Score calculation using multi-plane telemetry across 13 enterprise source systems
          </div>
        </div>

        <!-- ACTION BAR -->
        <div class="action-bar">
          <label style="font-size: 12px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Compromised Entry Entity:</label>
          <select class="select-box" .value=${this.entryEntity} @change=${(e) => { this.entryEntity = e.target.value; this.loadData(); }}>
            <option value="USER_JDOE">USER_JDOE (Compromised Executive Account)</option>
            <option value="EC2-APP-01">EC2-APP-01 (Web Application VM with Metadata Role)</option>
            <option value="APP-REG-001">APP-REG-001 (Overprivileged Entra ID Service Principal)</option>
            <option value="svc_sql_production">svc_sql_production (Kerberoastable SPN Account)</option>
            <option value="10.240.10.15">10.240.10.15 (Host Network Socket Entry)</option>
          </select>
          <button class="calc-btn" @click=${this.loadData} ?disabled=${this.loading}>
            <i class="fa-solid fa-calculator"></i> ${this.loading ? 'Calculating...' : 'Calculate Blast Radius'}
          </button>
          <button class="sync-btn" @click=${this.handleSyncSchema} ?disabled=${this.migrating}>
            <i class="fa-solid fa-rotate ${this.migrating ? 'fa-spin' : ''}"></i> ${this.migrating ? 'Syncing Schema...' : 'Re-Sync DDL & Telemetry'}
          </button>
        </div>

        <!-- KPI ROW -->
        <div class="kpi-row">
          <div class="kpi-card" style="border-color: #ef4444;">
            <div class="kpi-lbl" style="color: #ef4444;">Blast Radius Risk Score</div>
            <div class="kpi-val" style="color: #ef4444;">${data.blast_radius_score || 0.0}</div>
            <div style="font-size: 10.5px; color: #94a3b8; margin-top: 2px;">Formula: ∑(Crit × Sens × 1/Depth)</div>
          </div>
          <div class="kpi-card" style="border-color: #f59e0b;">
            <div class="kpi-lbl" style="color: #f59e0b;">Total Reachable Assets</div>
            <div class="kpi-val" style="color: #f59e0b;">${data.total_reachable_assets || 0} Assets</div>
          </div>
          <div class="kpi-card" style="border-color: #38bdf8;">
            <div class="kpi-lbl" style="color: #38bdf8;">Max Traversal Depth</div>
            <div class="kpi-val" style="color: #38bdf8;">${data.max_hop_depth || 0} Hops</div>
          </div>
          <div class="kpi-card" style="border-color: #a855f7;">
            <div class="kpi-lbl" style="color: #a855f7;">MITRE D3FEND Gaps</div>
            <div class="kpi-val" style="color: #a855f7;">${gaps.length} Gaps</div>
          </div>
        </div>

        <!-- GRAPH & TREE CONTAINER WITH TOGGLE -->
        <div class="graph-card">
          <div class="graph-header">
            <span><i class="fa-solid fa-network-wired"></i> 5-Hop Recursive CTE Topological Blast Radius View</span>
            
            <div style="display: flex; gap: 8px;">
              <button class="toggle-btn ${this.viewMode === 'graph' ? 'active' : ''}" @click=${() => this.viewMode = 'graph'}>
                <i class="fa-solid fa-circle-nodes"></i> Interactive Network Graph
              </button>
              <button class="toggle-btn ${this.viewMode === 'tree' ? 'active' : ''}" @click=${() => this.viewMode = 'tree'}>
                <i class="fa-solid fa-table-columns"></i> 5-Hop Tree Columns
              </button>
            </div>
          </div>

          ${this.viewMode === 'graph' ? html`
            <div style="position: relative;">
              <!-- GRAPH VISUAL LEGEND BAR -->
              <div class="graph-legend-bar">
                <div class="legend-header"><i class="fa-solid fa-map"></i> GRAPH LEGEND:</div>
                <div class="legend-items">
                  <div class="legend-item">
                    <span class="legend-dot" style="background: #00e5ff; box-shadow: 0 0 8px #00e5ff;"></span>
                    <span>Entry Entity (Hop 0)</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-dot" style="background: #ef4444;"></span>
                    <span>Hop 1 (Direct Reach)</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-dot" style="background: #f97316;"></span>
                    <span>Hop 2 (Transitive Access)</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-dot" style="background: #f59e0b;"></span>
                    <span>Hop 3 (Role Assumption)</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-dot" style="background: #a855f7;"></span>
                    <span>Hop 4 (Secrets & Vaults)</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-dot" style="background: #ec4899;"></span>
                    <span>Hop 5 (Critical Core Infrastructure)</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-line"></span>
                    <span>Exploit Propagation Path</span>
                  </div>
                </div>
              </div>

              <div id="rule-blast-cy-canvas"></div>

              <!-- NODE INSPECTOR POPOVER -->
              ${this.selectedNode ? html`
                <div class="node-inspector">
                  <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e2638; padding-bottom:6px; margin-bottom:8px;">
                    <span style="font-weight:800; color:#00e5ff; font-size:12px;">Asset Node Inspector</span>
                    <button @click=${() => this.selectedNode = null} style="background:none; border:none; color:#94a3b8; cursor:pointer;">✕</button>
                  </div>
                  <div style="font-weight:700; color:#ffffff; font-size:13px;">${this.selectedNode.id}</div>
                  <div style="font-size:11px; color:#8a99ad; text-transform:uppercase;">${this.selectedNode.type}</div>
                  <div style="margin-top:8px; font-size:11.5px; color:#cbd5e1;">
                    <div>Depth: <strong style="color:#00e5ff;">Hop ${this.selectedNode.hop}</strong></div>
                    <div>Risk Contribution: <strong style="color:#ef4444;">+${this.selectedNode.risk || 0}</strong></div>
                    <div>Criticality: ${this.selectedNode.criticality || 1.0} | Sensitivity: ${this.selectedNode.sensitivity || 1.0}</div>
                  </div>
                </div>
              ` : ''}
            </div>
          ` : html`
            <div class="hop-grid">
              ${[1, 2, 3, 4, 5].map(hop => html`
                <div class="hop-column">
                  <div class="hop-title">
                    <span>Hop ${hop}</span>
                    <span>${hopMap[hop].length} Node${hopMap[hop].length === 1 ? '' : 's'}</span>
                  </div>
                  ${hopMap[hop].length === 0 ? html`
                    <div style="font-size: 11px; color: #64748b; font-style: italic; text-align: center; padding: 10px;">No reachable nodes</div>
                  ` : html`
                    ${hopMap[hop].map(node => html`
                      <div class="node-card">
                        <div class="node-name">${node.entity}</div>
                        <div class="node-type">${node.type}</div>
                        <div class="node-rel"><i class="fa-solid fa-arrow-right" style="font-size: 9px;"></i> ${node.relationship}</div>
                        <div class="node-risk">+${node.risk_contribution} Risk</div>
                      </div>
                    `)}
                  `}
                </div>
              `)}
            </div>
          `}
        </div>

        <!-- BREAKDOWN TABLE -->
        <div class="table-card">
          <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
            <span>Reachable Enterprise Assets & Entitlements List</span>
            <span style="font-size: 12px; color: #8a99ad;">${assets.length} Assets Identified</span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Target Asset Entity</th>
                <th>Asset Type</th>
                <th>Relationship Type</th>
                <th>Hop Depth</th>
                <th>Criticality</th>
                <th>Sensitivity</th>
                <th>Risk Contribution</th>
              </tr>
            </thead>
            <tbody>
              ${assets.map(a => html`
                <tr>
                  <td><strong style="color: #38bdf8;">${a.entity}</strong></td>
                  <td><span style="font-size: 11px; font-weight: 700; color: #8a99ad;">${a.type}</span></td>
                  <td><code style="font-size: 11px; color: #00e5ff;">${a.relationship}</code></td>
                  <td><span style="font-weight: 700; color: #ffffff;">Hop ${a.hop_depth}</span></td>
                  <td>${a.criticality}</td>
                  <td>${a.sensitivity}</td>
                  <td><strong style="color: #ef4444;">+${a.risk_contribution}</strong></td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>

        <!-- D3FEND COUNTERMEASURE GAPS PANEL -->
        <div class="gaps-card">
          <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-shield-cat" style="color: #ef4444;"></i> MITRE D3FEND Countermeasure Gap Findings
          </div>

          ${gaps.map(g => html`
            <div class="gap-item">
              <div class="gap-header">
                <div>
                  <span class="gap-code">${g.code}</span>
                  <span class="gap-name">${g.name}</span>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: #ef4444; background: rgba(239,68,68,0.15); padding: 2px 8px; border-radius: 4px; border: 1px solid #ef4444;">${g.severity}</span>
              </div>
              <div class="gap-desc">${g.finding}</div>
              <div class="gap-rec"><i class="fa-solid fa-wrench"></i> Actionable Recommendation: ${g.recommendation}</div>
            </div>
          `)}
        </div>
      </div>
    `;
  }
}

customElements.define('rule-engine-blast-screen', RuleEngineBlastScreen);
